-- 임장노트 REL-001: RPC + auth.users → user_profile 동기화 트리거
-- 근거: imjang_note_api_contracts.md (API-AUTH-002/004, API-WS-001/002/003/005),
--       imjang_note_backend_architecture.md (rpc_accept_invite 등 단일 TX),
--       imjang_note_data_model.md §3 (정원 2 불변식)
-- 오류 코드: WS_VALIDATION_FAILED, WS_FORBIDDEN, WS_CAPACITY_FULL,
--            WS_INVITE_EXPIRED, AUTH_SOLE_OWNER_BLOCK, AUTH_VALIDATION_FAILED

-- ---------------------------------------------------------------------------
-- 0. 신규 가입 시 user_profile 자동 생성 (FR-AUTH-002)
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_profile (id, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1), '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- 1. idempotency 헬퍼: 기존 결과 있으면 반환, 없으면 NULL
-- ---------------------------------------------------------------------------
create or replace function public.idem_lookup(p_key text)
returns jsonb
language sql
security definer
set search_path = public
as $$
  select result from public.idempotency_key
  where actor_id = auth.uid() and key = p_key;
$$;

create or replace function public.idem_store(p_key text, p_result jsonb)
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.idempotency_key (actor_id, key, result)
  values (auth.uid(), p_key, p_result)
  on conflict (actor_id, key) do update set result = excluded.result;
$$;

-- ---------------------------------------------------------------------------
-- API-AUTH-002 rpc_upsert_profile (FR-AUTH-002)
-- ---------------------------------------------------------------------------
create or replace function public.rpc_upsert_profile(
  p_display_name text,
  p_avatar_url   text default null
)
returns public.user_profile
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.user_profile;
begin
  if auth.uid() is null then
    raise exception 'AUTH_VALIDATION_FAILED' using errcode = '28000';
  end if;
  if coalesce(btrim(p_display_name), '') = '' then
    raise exception 'AUTH_VALIDATION_FAILED' using errcode = '23514';
  end if;

  insert into public.user_profile (id, display_name, avatar_url)
  values (auth.uid(), p_display_name, p_avatar_url)
  on conflict (id) do update
    set display_name = excluded.display_name,
        avatar_url   = excluded.avatar_url
  returning * into v_row;

  return v_row;
end;
$$;

-- ---------------------------------------------------------------------------
-- API-WS-001 rpc_create_workspace (FR-WS-001) — 생성자 = owner
-- ---------------------------------------------------------------------------
create or replace function public.rpc_create_workspace(
  p_name            text,
  p_idempotency_key text
)
returns public.workspace
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ws     public.workspace;
  v_cached jsonb;
begin
  if auth.uid() is null then
    raise exception 'WS_FORBIDDEN' using errcode = '42501';
  end if;
  if coalesce(btrim(p_name), '') = '' then
    raise exception 'WS_VALIDATION_FAILED' using errcode = '23514';
  end if;

  v_cached := public.idem_lookup(p_idempotency_key);
  if v_cached is not null then
    return jsonb_populate_record(null::public.workspace, v_cached);
  end if;

  insert into public.workspace (name, owner_id)
  values (p_name, auth.uid())
  returning * into v_ws;

  insert into public.workspace_member (workspace_id, user_id, role)
  values (v_ws.id, auth.uid(), 'owner');

  perform public.idem_store(p_idempotency_key, to_jsonb(v_ws));
  return v_ws;
end;
$$;

-- ---------------------------------------------------------------------------
-- API-WS-002 rpc_create_invite (FR-WS-002) — owner만, 정원 검사
-- ---------------------------------------------------------------------------
create or replace function public.rpc_create_invite(
  p_workspace_id    uuid,
  p_ttl_minutes     int,
  p_idempotency_key text
)
returns public.workspace_invite
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invite public.workspace_invite;
  v_count  int;
  v_cached jsonb;
begin
  if not public.is_owner(p_workspace_id) then
    raise exception 'WS_FORBIDDEN' using errcode = '42501';
  end if;

  select count(*) into v_count
  from public.workspace_member
  where workspace_id = p_workspace_id;
  if v_count >= 2 then
    raise exception 'WS_CAPACITY_FULL' using errcode = '23514';
  end if;

  v_cached := public.idem_lookup(p_idempotency_key);
  if v_cached is not null then
    return jsonb_populate_record(null::public.workspace_invite, v_cached);
  end if;

  insert into public.workspace_invite (workspace_id, code, created_by, expires_at)
  values (
    p_workspace_id,
    encode(gen_random_bytes(9), 'base64'),               -- URL-safe-ish 초대 코드
    auth.uid(),
    now() + make_interval(mins => greatest(coalesce(p_ttl_minutes, 1440), 1))
  )
  returning * into v_invite;

  perform public.idem_store(p_idempotency_key, to_jsonb(v_invite));
  return v_invite;
end;
$$;

-- ---------------------------------------------------------------------------
-- API-WS-003 rpc_accept_invite (FR-WS-002) — partner 추가, 정원 2 불변식
-- ---------------------------------------------------------------------------
create or replace function public.rpc_accept_invite(
  p_code            text,
  p_idempotency_key text
)
returns public.workspace_member
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invite public.workspace_invite;
  v_member public.workspace_member;
  v_count  int;
  v_cached jsonb;
begin
  if auth.uid() is null then
    raise exception 'WS_FORBIDDEN' using errcode = '42501';
  end if;

  v_cached := public.idem_lookup(p_idempotency_key);
  if v_cached is not null then
    return jsonb_populate_record(null::public.workspace_member, v_cached);
  end if;

  -- 워크스페이스 정원 동시성 보호: 워크스페이스 행 잠금
  select * into v_invite
  from public.workspace_invite
  where code = p_code
  for update;

  if v_invite.id is null then
    raise exception 'WS_INVITE_EXPIRED' using errcode = '22023';
  end if;
  if v_invite.accepted_at is not null or v_invite.expires_at < now() then
    raise exception 'WS_INVITE_EXPIRED' using errcode = '22023';
  end if;

  -- 이미 멤버면 멱등 반환
  select * into v_member
  from public.workspace_member
  where workspace_id = v_invite.workspace_id and user_id = auth.uid();
  if v_member.id is not null then
    perform public.idem_store(p_idempotency_key, to_jsonb(v_member));
    return v_member;
  end if;

  perform 1 from public.workspace where id = v_invite.workspace_id for update;
  select count(*) into v_count
  from public.workspace_member
  where workspace_id = v_invite.workspace_id;
  if v_count >= 2 then
    raise exception 'WS_CAPACITY_FULL' using errcode = '23514';
  end if;

  insert into public.workspace_member (workspace_id, user_id, role)
  values (v_invite.workspace_id, auth.uid(), 'partner')
  returning * into v_member;

  update public.workspace_invite
    set accepted_by = auth.uid(), accepted_at = now()
  where id = v_invite.id;

  perform public.idem_store(p_idempotency_key, to_jsonb(v_member));
  return v_member;
end;
$$;

-- ---------------------------------------------------------------------------
-- API-WS-005 rpc_remove_member (FR-WS-004) — owner가 partner 제거 또는 WS 삭제
-- ---------------------------------------------------------------------------
create or replace function public.rpc_remove_member(
  p_workspace_id    uuid,
  p_target_user_id  uuid,
  p_idempotency_key text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_owner(p_workspace_id) then
    raise exception 'WS_FORBIDDEN' using errcode = '42501';
  end if;
  -- owner 본인 제거 금지(탈퇴/삭제는 별도 흐름 FR-AUTH-004)
  if p_target_user_id = auth.uid() then
    raise exception 'AUTH_SOLE_OWNER_BLOCK' using errcode = '42501';
  end if;

  delete from public.workspace_member
  where workspace_id = p_workspace_id
    and user_id = p_target_user_id
    and role = 'partner';

  return jsonb_build_object('ok', true);
end;
$$;

-- ---------------------------------------------------------------------------
-- 권한: 인증 사용자(authenticated)만 RPC 실행
-- ---------------------------------------------------------------------------
grant execute on function
  public.rpc_upsert_profile(text, text),
  public.rpc_create_workspace(text, text),
  public.rpc_create_invite(uuid, int, text),
  public.rpc_accept_invite(text, text),
  public.rpc_remove_member(uuid, uuid, text)
to authenticated;
