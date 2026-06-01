-- 임장노트 REL-004: 코멘트 + Realtime 공유 (FR-COMMENT-001, FR-WS-003)
-- 엔티티: ENT-CMT-001 comment
-- 이벤트: EVT-CMT-001 comment.created, EVT-NOTE-001/002 note.* (Realtime postgres_changes)
-- 근거: data_model.md §2/§5, api_contracts.md (API-COMMENT-001/002, §7 Realtime)
-- 주: comment에 workspace_id를 비정규화해 Realtime 필터·RLS를 단순화(note_photo와 동일 패턴)

-- ---------------------------------------------------------------------------
-- 1. comment (ENT-CMT-001) — append-only(작성자/owner 삭제 허용)
-- ---------------------------------------------------------------------------
create table if not exists public.comment (
  id           uuid primary key default gen_random_uuid(),
  note_id      uuid not null references public.note (id) on delete cascade,
  workspace_id uuid not null references public.workspace (id) on delete cascade,
  author_id    uuid not null references public.user_profile (id) on delete restrict,
  body         text not null check (char_length(body) between 1 and 1000),
  created_at   timestamptz not null default now(),
  deleted_at   timestamptz
);

create index if not exists comment_note_idx on public.comment (note_id, created_at);

-- ---------------------------------------------------------------------------
-- 2. RLS (data_model §5)
-- ---------------------------------------------------------------------------
alter table public.comment enable row level security;

drop policy if exists comment_select on public.comment;
create policy comment_select on public.comment
  for select using (public.is_member(workspace_id) and deleted_at is null);

drop policy if exists comment_delete on public.comment;
create policy comment_delete on public.comment
  for delete using (author_id = auth.uid() or public.is_owner(workspace_id));

-- INSERT는 rpc_add_comment(SECURITY DEFINER) 경유

-- ---------------------------------------------------------------------------
-- 3. API-COMMENT-001 rpc_add_comment (FR-COMMENT-001)
-- ---------------------------------------------------------------------------
create or replace function public.rpc_add_comment(
  p_note_id         uuid,
  p_body            text,
  p_idempotency_key text
)
returns public.comment
language plpgsql
security definer
set search_path = public
as $$
declare
  v_note    public.note;
  v_comment public.comment;
  v_cached  jsonb;
begin
  select * into v_note from public.note where id = p_note_id and deleted_at is null;
  if v_note.id is null then
    raise exception 'NOTE_NOT_FOUND' using errcode = 'P0002';
  end if;
  if not public.is_member(v_note.workspace_id) then
    raise exception 'NOTE_FORBIDDEN' using errcode = '42501';
  end if;
  if coalesce(btrim(p_body), '') = '' then
    raise exception 'COMMENT_VALIDATION_FAILED' using errcode = '23514';
  end if;

  v_cached := public.idem_lookup(p_idempotency_key);
  if v_cached is not null then
    return jsonb_populate_record(null::public.comment, v_cached);
  end if;

  insert into public.comment (note_id, workspace_id, author_id, body)
  values (p_note_id, v_note.workspace_id, auth.uid(), btrim(p_body))
  returning * into v_comment;

  perform public.idem_store(p_idempotency_key, to_jsonb(v_comment));
  return v_comment;
end;
$$;

grant execute on function public.rpc_add_comment(uuid, text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- 4. Realtime 발행 (FR-WS-003) — note/comment 변경을 워크스페이스 멤버에 전파
--    클라이언트는 postgres_changes 구독 후 React Query 캐시 무효화(frontend §4.5).
--    RLS가 적용되므로 멤버만 자기 워크스페이스 변경을 수신한다.
-- ---------------------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'note'
  ) then
    alter publication supabase_realtime add table public.note;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'comment'
  ) then
    alter publication supabase_realtime add table public.comment;
  end if;
end$$;
