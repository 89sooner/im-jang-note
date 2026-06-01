-- 임장노트 REL-003: 임장 노트 + 체크리스트 + 사진 메타
-- 엔티티: ENT-NOTE-001 note, ENT-NOTE-002 note_checklist, ENT-MEDIA-001 note_photo
-- 근거: data_model.md §2/§3/§5, api_contracts.md (API-NOTE-001~004, NoteInput/ChecklistItem)
-- 원칙: note+note_checklist는 rpc_save_note 단일 트랜잭션 원자 저장(data_model §3)

-- ---------------------------------------------------------------------------
-- 1. Enum: 체크리스트 카테고리 (api_contracts §4 ChecklistItem)
-- ---------------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'checklist_category') then
    create type public.checklist_category as enum
      ('교통', '학군', '소음', '채광', '관리상태', '주변환경');
  end if;
end$$;

-- ---------------------------------------------------------------------------
-- 2. Tables
-- ---------------------------------------------------------------------------
create table if not exists public.note (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspace (id) on delete cascade,
  complex_id   uuid not null references public.complex (id) on delete restrict,
  author_id    uuid not null references public.user_profile (id) on delete restrict,
  visited_at   date not null,
  rating       int not null check (rating between 1 and 5),
  free_memo    text not null default '' check (char_length(free_memo) <= 2000),
  created_by   uuid not null references public.user_profile (id),
  updated_by   uuid not null references public.user_profile (id),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  deleted_at   timestamptz
);

create index if not exists note_ws_created_idx on public.note (workspace_id, created_at desc);
create index if not exists note_ws_complex_idx on public.note (workspace_id, complex_id);

create table if not exists public.note_checklist (
  id       uuid primary key default gen_random_uuid(),
  note_id  uuid not null references public.note (id) on delete cascade,
  category public.checklist_category not null,
  score    int not null check (score between 1 and 5),
  memo     text check (char_length(memo) <= 500),
  unique (note_id, category)
);

create index if not exists note_checklist_note_idx on public.note_checklist (note_id);

create table if not exists public.note_photo (
  id             uuid primary key default gen_random_uuid(),
  note_id        uuid not null references public.note (id) on delete cascade,
  workspace_id   uuid not null references public.workspace (id) on delete cascade,
  storage_path   text not null,
  thumbnail_path text,
  width          int,
  height         int,
  bytes          int,
  created_by     uuid not null references public.user_profile (id),
  created_at     timestamptz not null default now()
);

create index if not exists note_photo_note_idx on public.note_photo (note_id);

drop trigger if exists note_set_updated_at on public.note;
create trigger note_set_updated_at
  before update on public.note
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 3. RLS (data_model §5)
-- ---------------------------------------------------------------------------
alter table public.note           enable row level security;
alter table public.note_checklist enable row level security;
alter table public.note_photo     enable row level security;

-- note: 멤버 SELECT(삭제 제외). write는 rpc 경유. (작성자/owner는 rpc 내부에서 검증)
drop policy if exists note_select on public.note;
create policy note_select on public.note
  for select using (public.is_member(workspace_id) and deleted_at is null);

-- note_checklist: 부모 note 멤버십 상속(SELECT). write는 rpc 경유.
drop policy if exists note_checklist_select on public.note_checklist;
create policy note_checklist_select on public.note_checklist
  for select using (
    exists (select 1 from public.note n
            where n.id = note_checklist.note_id
              and public.is_member(n.workspace_id)
              and n.deleted_at is null)
  );

-- note_photo: 멤버 SELECT. INSERT는 author 본인(media_upload_url Edge Fn은 service_role).
drop policy if exists note_photo_select on public.note_photo;
create policy note_photo_select on public.note_photo
  for select using (public.is_member(workspace_id));

drop policy if exists note_photo_delete on public.note_photo;
create policy note_photo_delete on public.note_photo
  for delete using (
    created_by = auth.uid()
    or public.is_owner(workspace_id)
  );

-- ---------------------------------------------------------------------------
-- 4. API-NOTE-001 rpc_save_note (FR-NOTE-001~004/006) — note + checklist 원자 저장
-- ---------------------------------------------------------------------------
create or replace function public.rpc_save_note(
  p_note_id         uuid,
  p_workspace_id    uuid,
  p_complex_id      uuid,
  p_visited_at      date,
  p_rating          int,
  p_free_memo       text,
  p_checklist       jsonb,        -- [{category,score,memo}]
  p_idempotency_key text
)
returns public.note
language plpgsql
security definer
set search_path = public
as $$
declare
  v_note    public.note;
  v_cached  jsonb;
  v_item    jsonb;
  v_existing public.note;
begin
  if not public.is_member(p_workspace_id) then
    raise exception 'NOTE_FORBIDDEN' using errcode = '42501';
  end if;
  if p_visited_at is null or p_rating is null or p_rating < 1 or p_rating > 5 then
    raise exception 'NOTE_VALIDATION_FAILED' using errcode = '23514';
  end if;

  v_cached := public.idem_lookup(p_idempotency_key);
  if v_cached is not null then
    return jsonb_populate_record(null::public.note, v_cached);
  end if;

  if p_note_id is null then
    -- 신규 작성: author = 현재 사용자
    insert into public.note (workspace_id, complex_id, author_id, visited_at,
                             rating, free_memo, created_by, updated_by)
    values (p_workspace_id, p_complex_id, auth.uid(), p_visited_at,
            p_rating, coalesce(p_free_memo, ''), auth.uid(), auth.uid())
    returning * into v_note;
  else
    -- 편집: 작성자 또는 owner만 (FR-NOTE-006)
    select * into v_existing from public.note where id = p_note_id and deleted_at is null;
    if v_existing.id is null then
      raise exception 'NOTE_NOT_FOUND' using errcode = 'P0002';
    end if;
    if v_existing.author_id <> auth.uid() and not public.is_owner(v_existing.workspace_id) then
      raise exception 'NOTE_FORBIDDEN' using errcode = '42501';
    end if;

    update public.note
      set visited_at = p_visited_at,
          rating     = p_rating,
          free_memo  = coalesce(p_free_memo, ''),
          updated_by = auth.uid()
    where id = p_note_id
    returning * into v_note;
  end if;

  -- 체크리스트 전체 교체 (단일 트랜잭션 원자성)
  delete from public.note_checklist where note_id = v_note.id;
  if p_checklist is not null then
    for v_item in select * from jsonb_array_elements(p_checklist)
    loop
      insert into public.note_checklist (note_id, category, score, memo)
      values (
        v_note.id,
        (v_item ->> 'category')::public.checklist_category,
        (v_item ->> 'score')::int,
        nullif(v_item ->> 'memo', '')
      )
      on conflict (note_id, category)
      do update set score = excluded.score, memo = excluded.memo;
    end loop;
  end if;

  perform public.idem_store(p_idempotency_key, to_jsonb(v_note));
  return v_note;
end;
$$;

-- ---------------------------------------------------------------------------
-- 5. API-NOTE-002 rpc_delete_note (FR-NOTE-006) — 소프트 삭제
-- ---------------------------------------------------------------------------
create or replace function public.rpc_delete_note(
  p_note_id         uuid,
  p_idempotency_key text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_note public.note;
begin
  select * into v_note from public.note where id = p_note_id and deleted_at is null;
  if v_note.id is null then
    raise exception 'NOTE_NOT_FOUND' using errcode = 'P0002';
  end if;
  if v_note.author_id <> auth.uid() and not public.is_owner(v_note.workspace_id) then
    raise exception 'NOTE_FORBIDDEN' using errcode = '42501';
  end if;

  update public.note set deleted_at = now(), updated_by = auth.uid()
  where id = p_note_id;

  return jsonb_build_object('ok', true);
end;
$$;

grant execute on function
  public.rpc_save_note(uuid, uuid, uuid, date, int, text, jsonb, text),
  public.rpc_delete_note(uuid, text)
to authenticated;
