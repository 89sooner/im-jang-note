-- 임장노트 REL-005: 알림 + 디바이스 토큰 (FR-NOTIFY-001/002)
-- 엔티티: ENT-NOTIFY-001 notification, ENT-DEV-001 device_token
-- 잡: JOB-NOTIFY-001 — note/comment 생성 시 상대 멤버에게 알림 생성(in-app),
--     Expo Push 발송은 Edge Fn notify_worker(외부 전송).
-- 근거: data_model.md §2/§5, api_contracts.md (API-NOTIFY-001/002), async §JOB-NOTIFY-001

-- ---------------------------------------------------------------------------
-- 1. Enum
-- ---------------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'notification_type') then
    create type public.notification_type as enum
      ('note_created', 'comment_created', 'member_joined');
  end if;
end$$;

-- ---------------------------------------------------------------------------
-- 2. Tables
-- ---------------------------------------------------------------------------
create table if not exists public.notification (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspace (id) on delete cascade,
  recipient_id uuid not null references public.user_profile (id) on delete cascade,
  type         public.notification_type not null,
  payload      jsonb not null default '{}'::jsonb,
  pushed_at    timestamptz,                       -- Expo Push 발송 완료 시각(JOB-NOTIFY-001)
  read_at      timestamptz,
  created_at   timestamptz not null default now()
);

create index if not exists notification_recipient_idx
  on public.notification (recipient_id, created_at desc);
create index if not exists notification_unread_idx
  on public.notification (recipient_id) where read_at is null;
create index if not exists notification_unpushed_idx
  on public.notification (created_at) where pushed_at is null;

create table if not exists public.device_token (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.user_profile (id) on delete cascade,
  expo_push_token text not null,
  enabled         boolean not null default true,
  updated_at      timestamptz not null default now(),
  unique (user_id, expo_push_token)
);

create index if not exists device_token_user_idx on public.device_token (user_id) where enabled;

-- ---------------------------------------------------------------------------
-- 3. RLS (data_model §5)
-- ---------------------------------------------------------------------------
alter table public.notification enable row level security;
alter table public.device_token enable row level security;

-- notification: recipient만 SELECT/UPDATE(read). INSERT는 서버(트리거/Edge Fn).
drop policy if exists notification_select on public.notification;
create policy notification_select on public.notification
  for select using (recipient_id = auth.uid());

drop policy if exists notification_update on public.notification;
create policy notification_update on public.notification
  for update using (recipient_id = auth.uid()) with check (recipient_id = auth.uid());

-- device_token: self만
drop policy if exists device_token_self on public.device_token;
create policy device_token_self on public.device_token
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- 4. API-NOTIFY-002 rpc_register_device (FR-NOTIFY-001/002)
-- ---------------------------------------------------------------------------
create or replace function public.rpc_register_device(
  p_expo_push_token text,
  p_enabled         boolean,
  p_idempotency_key text
)
returns public.device_token
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.device_token;
begin
  if auth.uid() is null then
    raise exception 'AUTH_VALIDATION_FAILED' using errcode = '28000';
  end if;

  insert into public.device_token (user_id, expo_push_token, enabled, updated_at)
  values (auth.uid(), p_expo_push_token, coalesce(p_enabled, true), now())
  on conflict (user_id, expo_push_token)
  do update set enabled = excluded.enabled, updated_at = now()
  returning * into v_row;

  return v_row;
end;
$$;

-- 알림 읽음 처리(편의 RPC; recipient RLS와 일치)
create or replace function public.rpc_mark_notifications_read(
  p_ids uuid[]
)
returns jsonb
language sql
security definer
set search_path = public
as $$
  with upd as (
    update public.notification
      set read_at = now()
    where recipient_id = auth.uid()
      and id = any(p_ids)
      and read_at is null
    returning 1
  )
  select jsonb_build_object('updated', (select count(*) from upd));
$$;

grant execute on function
  public.rpc_register_device(text, boolean, text),
  public.rpc_mark_notifications_read(uuid[])
to authenticated;

-- ---------------------------------------------------------------------------
-- 5. JOB-NOTIFY-001 (in-app 부분): note/comment 생성 → 상대 멤버 알림 생성
--    Expo Push 외부 발송은 Edge Fn notify_worker가 pushed_at is null 행을 처리.
-- ---------------------------------------------------------------------------
create or replace function public.fn_notify_on_note()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.notification (workspace_id, recipient_id, type, payload)
  select NEW.workspace_id, m.user_id, 'note_created',
         jsonb_build_object('note_id', NEW.id, 'complex_id', NEW.complex_id, 'author_id', NEW.author_id)
  from public.workspace_member m
  where m.workspace_id = NEW.workspace_id
    and m.user_id <> NEW.author_id;
  return NEW;
end;
$$;

drop trigger if exists notify_on_note_insert on public.note;
create trigger notify_on_note_insert
  after insert on public.note
  for each row execute function public.fn_notify_on_note();

create or replace function public.fn_notify_on_comment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.notification (workspace_id, recipient_id, type, payload)
  select NEW.workspace_id, m.user_id, 'comment_created',
         jsonb_build_object('comment_id', NEW.id, 'note_id', NEW.note_id, 'author_id', NEW.author_id)
  from public.workspace_member m
  where m.workspace_id = NEW.workspace_id
    and m.user_id <> NEW.author_id;
  return NEW;
end;
$$;

drop trigger if exists notify_on_comment_insert on public.comment;
create trigger notify_on_comment_insert
  after insert on public.comment
  for each row execute function public.fn_notify_on_comment();

-- ---------------------------------------------------------------------------
-- 6. Realtime 발행: notification (알림 센터 실시간 갱신)
-- ---------------------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'notification'
  ) then
    alter publication supabase_realtime add table public.notification;
  end if;
end$$;
