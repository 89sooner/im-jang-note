-- 임장노트 REL-005: 즐겨찾기/후보 + 마커 상태 (FR-FAV-001/002, FR-MAP-005)
-- 엔티티: ENT-FAV-001 favorite
-- 근거: data_model.md §2/§5, api_contracts.md (API-FAV-001/002)

-- ---------------------------------------------------------------------------
-- 1. favorite (ENT-FAV-001) — 워크스페이스 공유 후보 (부부 공동 관리)
-- ---------------------------------------------------------------------------
create table if not exists public.favorite (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspace (id) on delete cascade,
  complex_id   uuid not null references public.complex (id) on delete cascade,
  created_by   uuid not null references public.user_profile (id) on delete set null,
  created_at   timestamptz not null default now(),
  unique (workspace_id, complex_id)             -- 토글 멱등 (data_model §4)
);

create index if not exists favorite_ws_idx on public.favorite (workspace_id, complex_id);

-- ---------------------------------------------------------------------------
-- 2. RLS (data_model §5): 멤버 SELECT, INSERT/DELETE는 rpc 경유
-- ---------------------------------------------------------------------------
alter table public.favorite enable row level security;

drop policy if exists favorite_select on public.favorite;
create policy favorite_select on public.favorite
  for select using (public.is_member(workspace_id));

-- ---------------------------------------------------------------------------
-- 3. API-FAV-002 rpc_toggle_favorite (FR-FAV-001) — 멱등 토글
-- ---------------------------------------------------------------------------
create or replace function public.rpc_toggle_favorite(
  p_workspace_id    uuid,
  p_complex_id      uuid,
  p_idempotency_key text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_fav public.favorite;
begin
  if not public.is_member(p_workspace_id) then
    raise exception 'WS_FORBIDDEN' using errcode = '42501';
  end if;

  select * into v_fav
  from public.favorite
  where workspace_id = p_workspace_id and complex_id = p_complex_id;

  if v_fav.id is not null then
    delete from public.favorite where id = v_fav.id;
    return jsonb_build_object('favorited', false, 'complex_id', p_complex_id);
  else
    insert into public.favorite (workspace_id, complex_id, created_by)
    values (p_workspace_id, p_complex_id, auth.uid());
    return jsonb_build_object('favorited', true, 'complex_id', p_complex_id);
  end if;
end;
$$;

grant execute on function public.rpc_toggle_favorite(uuid, uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- 4. FR-MAP-005: 마커 상태 구분 (favorite/has_note)
--    rpc_markers_in_bbox에 p_workspace_id 추가(기본 null=plain). 멤버 워크스페이스
--    기준으로 즐겨찾기/노트 보유 단지를 색·상태로 구분(노트 우선순위는 favorite > has_note).
-- ---------------------------------------------------------------------------
create or replace function public.rpc_markers_in_bbox(
  p_min_lat double precision,
  p_min_lng double precision,
  p_max_lat double precision,
  p_max_lng double precision,
  p_zoom    int default 14,
  p_limit   int default 300,
  p_workspace_id uuid default null
)
returns table (complex_id uuid, lat double precision, lng double precision, name text, state text)
language sql
stable
security definer
set search_path = public
as $$
  select
    c.id, c.lat, c.lng, c.name,
    case
      when p_workspace_id is null then 'plain'
      when exists (
        select 1 from public.favorite f
        where f.workspace_id = p_workspace_id and f.complex_id = c.id
      ) then 'favorite'
      when exists (
        select 1 from public.note n
        where n.workspace_id = p_workspace_id and n.complex_id = c.id and n.deleted_at is null
      ) then 'has_note'
      else 'plain'
    end as state
  from public.complex c
  where c.lat between p_min_lat and p_max_lat
    and c.lng between p_min_lng and p_max_lng
    and (p_workspace_id is null or public.is_member(p_workspace_id))
  order by c.lat desc
  limit greatest(coalesce(p_limit, 300), 1);
$$;

grant execute on function
  public.rpc_markers_in_bbox(double precision, double precision, double precision, double precision, int, int, uuid)
to authenticated;
