-- 임장노트 REL-001: 인증 / 워크스페이스 기반 스키마 + RLS
-- 대상 엔티티: ENT-USR-001 user_profile, ENT-WS-001 workspace,
--             ENT-WS-002 workspace_member, ENT-WS-003 workspace_invite
-- 근거: docs/30_technical_architecture/imjang_note_data_model.md §2/§5,
--       imjang_note_api_contracts.md (API-AUTH-*, API-WS-*)
-- 원칙: 모든 테이블 RLS enable + 기본 거부, 워크스페이스 단위 격리(NFR-002).

-- ---------------------------------------------------------------------------
-- 0. Extensions
-- ---------------------------------------------------------------------------
create extension if not exists pgcrypto;      -- gen_random_uuid()

-- ---------------------------------------------------------------------------
-- 1. Enums
-- ---------------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'workspace_role') then
    create type public.workspace_role as enum ('owner', 'partner');
  end if;
end$$;

-- ---------------------------------------------------------------------------
-- 2. Tables
-- ---------------------------------------------------------------------------

-- ENT-USR-001 user_profile (auth.users 1:1, id = uid)
create table if not exists public.user_profile (
  id                    uuid primary key references auth.users (id) on delete cascade,
  display_name          text not null default '',
  avatar_url            text,
  consents              jsonb not null default '{}'::jsonb,   -- ADR-006 동의 상태
  settings              jsonb not null default '{}'::jsonb,   -- FR-SET-001
  deletion_scheduled_at timestamptz,                          -- FR-AUTH-004
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

-- ENT-WS-001 workspace (부부 그룹, 정원 2)
create table if not exists public.workspace (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  owner_id   uuid not null references public.user_profile (id) on delete restrict,
  created_at timestamptz not null default now(),
  deleted_at timestamptz                                       -- soft delete (FR-WS-004)
);

-- ENT-WS-002 workspace_member (멤버십·역할)
create table if not exists public.workspace_member (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspace (id) on delete cascade,
  user_id      uuid not null references public.user_profile (id) on delete cascade,
  role         public.workspace_role not null,
  joined_at    timestamptz not null default now(),
  unique (workspace_id, user_id)                               -- 중복 멤버십 방지
);

-- 정원 불변식 일부: workspace당 owner 정확히 1 (부분 유니크)
create unique index if not exists workspace_member_one_owner
  on public.workspace_member (workspace_id)
  where role = 'owner';

create index if not exists workspace_member_user_idx
  on public.workspace_member (user_id);

-- ENT-WS-003 workspace_invite (만료 가능 초대)
create table if not exists public.workspace_invite (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspace (id) on delete cascade,
  code         text not null unique,                           -- API-WS-003 조회
  created_by   uuid not null references public.user_profile (id) on delete cascade,
  expires_at   timestamptz not null,
  accepted_by  uuid references public.user_profile (id),
  accepted_at  timestamptz,
  created_at   timestamptz not null default now()
);

-- idempotency 보존(FR-SYNC-002, data_model §6): (actor, key) → 결과 윈도우
create table if not exists public.idempotency_key (
  actor_id   uuid not null references public.user_profile (id) on delete cascade,
  key        text not null,
  result     jsonb,
  created_at timestamptz not null default now(),
  primary key (actor_id, key)
);

-- ---------------------------------------------------------------------------
-- 3. RLS helper functions (SECURITY DEFINER로 RLS 재귀 회피)
-- ---------------------------------------------------------------------------
create or replace function public.is_member(p_workspace_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.workspace_member m
    where m.workspace_id = p_workspace_id
      and m.user_id = auth.uid()
  );
$$;

create or replace function public.is_owner(p_workspace_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.workspace_member m
    where m.workspace_id = p_workspace_id
      and m.user_id = auth.uid()
      and m.role = 'owner'
  );
$$;

-- ---------------------------------------------------------------------------
-- 4. updated_at 트리거
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists user_profile_set_updated_at on public.user_profile;
create trigger user_profile_set_updated_at
  before update on public.user_profile
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 5. RLS 정책 (data_model.md §5)
-- ---------------------------------------------------------------------------
alter table public.user_profile     enable row level security;
alter table public.workspace        enable row level security;
alter table public.workspace_member enable row level security;
alter table public.workspace_invite enable row level security;
alter table public.idempotency_key  enable row level security;

-- user_profile: self 또는 같은 워크스페이스 멤버 SELECT, self만 UPDATE
drop policy if exists user_profile_select on public.user_profile;
create policy user_profile_select on public.user_profile
  for select using (
    id = auth.uid()
    or exists (
      select 1
      from public.workspace_member me
      join public.workspace_member other
        on other.workspace_id = me.workspace_id
      where me.user_id = auth.uid()
        and other.user_id = user_profile.id
    )
  );

drop policy if exists user_profile_update on public.user_profile;
create policy user_profile_update on public.user_profile
  for update using (id = auth.uid()) with check (id = auth.uid());

-- workspace: 멤버 SELECT, owner UPDATE/DELETE. INSERT는 RPC(SECURITY DEFINER) 경유.
drop policy if exists workspace_select on public.workspace;
create policy workspace_select on public.workspace
  for select using (public.is_member(id));

drop policy if exists workspace_update on public.workspace;
create policy workspace_update on public.workspace
  for update using (public.is_owner(id)) with check (public.is_owner(id));

-- workspace_member: 멤버 SELECT. 쓰기는 RPC 경유(직접 INSERT 차단).
drop policy if exists workspace_member_select on public.workspace_member;
create policy workspace_member_select on public.workspace_member
  for select using (public.is_member(workspace_id));

-- self leave 허용(본인 멤버십 삭제)
drop policy if exists workspace_member_self_leave on public.workspace_member;
create policy workspace_member_self_leave on public.workspace_member
  for delete using (user_id = auth.uid());

-- workspace_invite: owner만 조회/발급. 수락은 RPC 경유.
drop policy if exists workspace_invite_select on public.workspace_invite;
create policy workspace_invite_select on public.workspace_invite
  for select using (public.is_owner(workspace_id));

-- idempotency_key: self만
drop policy if exists idempotency_self on public.idempotency_key;
create policy idempotency_self on public.idempotency_key
  for all using (actor_id = auth.uid()) with check (actor_id = auth.uid());
