-- 임장노트 REL-006: 계정 탈퇴 예약 (FR-AUTH-004)
-- 근거: api_contracts.md API-AUTH-004 rpc_request_account_deletion,
--       data_model.md §6 (user_profile.deletion_scheduled_at),
--       ADR-006 (탈퇴 시 작성자 본인 데이터 30일 grace, 코멘트 익명화)
-- 정책:
--   - 단독 owner인 워크스페이스가 있으면 AUTH_SOLE_OWNER_BLOCK
--     (사전에 partner에게 위임하거나 워크스페이스 삭제 필요)
--   - 본인 작성 note는 deleted_at = now() (소프트 삭제; 정리 잡으로 30일 후 hard-delete)
--   - 본인 작성 comment도 동일하게 처리
--   - workspace_member에서 본인 멤버십 제거
--   - user_profile.deletion_scheduled_at 설정 → 후속 정리 잡이 user 데이터 폐기

create or replace function public.rpc_request_account_deletion(
  p_idempotency_key text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid             uuid := auth.uid();
  v_sole_owner_cnt  int;
  v_scheduled_at    timestamptz := now() + interval '30 days';
  v_cached          jsonb;
begin
  if v_uid is null then
    raise exception 'AUTH_VALIDATION_FAILED' using errcode = '28000';
  end if;

  v_cached := public.idem_lookup(p_idempotency_key);
  if v_cached is not null then
    return v_cached;
  end if;

  -- 단독 owner인 워크스페이스가 있는지 확인 (정원 1명이며 그게 본인)
  select count(*) into v_sole_owner_cnt
  from public.workspace_member m
  where m.user_id = v_uid
    and m.role = 'owner'
    and (
      select count(*) from public.workspace_member mm
      where mm.workspace_id = m.workspace_id
    ) = 1;

  if v_sole_owner_cnt > 0 then
    raise exception 'AUTH_SOLE_OWNER_BLOCK' using errcode = '42501';
  end if;

  -- 본인 작성 노트/코멘트 소프트 삭제
  update public.note set deleted_at = now(), updated_by = v_uid
  where author_id = v_uid and deleted_at is null;

  update public.comment set deleted_at = now()
  where author_id = v_uid and deleted_at is null;

  -- 워크스페이스 멤버십 제거 (남은 워크스페이스에서 본인만 떠남)
  delete from public.workspace_member where user_id = v_uid;

  -- 디바이스 토큰 비활성화
  update public.device_token set enabled = false where user_id = v_uid;

  -- 탈퇴 예약
  update public.user_profile
    set deletion_scheduled_at = v_scheduled_at
  where id = v_uid;

  perform public.idem_store(
    p_idempotency_key,
    jsonb_build_object('scheduled_at', v_scheduled_at)
  );
  return jsonb_build_object('scheduled_at', v_scheduled_at);
end;
$$;

grant execute on function public.rpc_request_account_deletion(text) to authenticated;
