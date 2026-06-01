-- 임장노트 REL-002: 단지/실거래가 (지도 데이터)
-- 엔티티: ENT-CMP-001 complex, ENT-TX-001 transaction_cache
-- 근거: data_model.md §2/§4/§5, api_contracts.md (API-MAP-001/003, API-DATA-*),
--       ADR-004(캐시 + TTL + stale-while-revalidate)
-- 주: 운영에서는 GiST geography 공간 인덱스(data_model §4) 권장. 골격은
--    이식성을 위해 lat/lng 범위 인덱스 + bbox 범위 질의로 구현한다(NFR-007 동등 결과).

-- ---------------------------------------------------------------------------
-- 1. complex (ENT-CMP-001) — 국토부 단지 메타 캐시
-- ---------------------------------------------------------------------------
create table if not exists public.complex (
  id               uuid primary key default gen_random_uuid(),
  external_id      text unique,                 -- 국토부 단지식별자(없으면 좌표+주소 해시)
  name             text not null,
  address          text,
  lat              double precision not null,
  lng              double precision not null,
  lawd_cd          text,                        -- 법정동 시군구코드(실거래가 조회용)
  total_households int,
  build_year       int,
  fetched_at       timestamptz,                 -- 국토부 메타 신선도(ADR-004)
  created_by       uuid references public.user_profile (id) on delete set null,
  created_at       timestamptz not null default now()
);

create index if not exists complex_bbox_idx on public.complex (lat, lng);
create index if not exists complex_name_idx on public.complex (name);
create index if not exists complex_lawd_idx on public.complex (lawd_cd);

-- ---------------------------------------------------------------------------
-- 2. transaction_cache (ENT-TX-001) — 실거래가 캐시
-- ---------------------------------------------------------------------------
create table if not exists public.transaction_cache (
  id          uuid primary key default gen_random_uuid(),
  complex_id  uuid not null references public.complex (id) on delete cascade,
  deal_date   date not null,
  area_m2     numeric(7,2) not null,
  floor       int,
  price       bigint not null,                  -- 만원 단위 정수
  fetched_at  timestamptz not null default now(),
  is_stale    boolean not null default false,
  -- 중복 거래 dedupe (api_contracts §8)
  unique (complex_id, deal_date, area_m2, floor, price)
);

create index if not exists tx_complex_date_idx
  on public.transaction_cache (complex_id, deal_date desc);
create index if not exists tx_complex_area_idx
  on public.transaction_cache (complex_id, area_m2);

-- ---------------------------------------------------------------------------
-- 3. RLS (data_model §5): 공용 캐시 — 인증 사용자 read, write는 RPC/서버 잡
-- ---------------------------------------------------------------------------
alter table public.complex           enable row level security;
alter table public.transaction_cache enable row level security;

-- complex: 인증 사용자 SELECT
drop policy if exists complex_select on public.complex;
create policy complex_select on public.complex
  for select to authenticated using (true);

-- complex INSERT는 rpc_create_complex(SECURITY DEFINER) 경유. 직접 UPDATE는 차단.
-- (서버 잡 JOB-DATA-002는 service_role로 RLS 우회)

-- transaction_cache: 인증 사용자 SELECT (write는 service_role 잡만)
drop policy if exists transaction_cache_select on public.transaction_cache;
create policy transaction_cache_select on public.transaction_cache
  for select to authenticated using (true);

-- ---------------------------------------------------------------------------
-- 4. API-MAP-003 rpc_create_complex (FR-MAP-003) — 미등록 단지 생성
-- ---------------------------------------------------------------------------
create or replace function public.rpc_create_complex(
  p_name            text,
  p_lat             double precision,
  p_lng             double precision,
  p_address         text,
  p_idempotency_key text
)
returns public.complex
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row    public.complex;
  v_cached jsonb;
begin
  if auth.uid() is null then
    raise exception 'MAP_VALIDATION_FAILED' using errcode = '28000';
  end if;
  if coalesce(btrim(p_name), '') = '' or p_lat is null or p_lng is null then
    raise exception 'MAP_VALIDATION_FAILED' using errcode = '23514';
  end if;

  v_cached := public.idem_lookup(p_idempotency_key);
  if v_cached is not null then
    return jsonb_populate_record(null::public.complex, v_cached);
  end if;

  insert into public.complex (name, lat, lng, address, created_by)
  values (p_name, p_lat, p_lng, p_address, auth.uid())
  returning * into v_row;

  perform public.idem_store(p_idempotency_key, to_jsonb(v_row));
  return v_row;
end;
$$;

-- ---------------------------------------------------------------------------
-- 5. API-MAP-001 rpc_markers_in_bbox (FR-MAP-001/002/005) — 뷰포트 마커
--    state: REL-002는 'plain' 고정. 노트/즐겨찾기 보유 구분(FR-MAP-005)은
--    note(REL-003)/favorite(REL-005) 도입 시 left join으로 확장한다.
-- ---------------------------------------------------------------------------
create or replace function public.rpc_markers_in_bbox(
  p_min_lat double precision,
  p_min_lng double precision,
  p_max_lat double precision,
  p_max_lng double precision,
  p_zoom    int default 14,
  p_limit   int default 300
)
returns table (complex_id uuid, lat double precision, lng double precision, name text, state text)
language sql
stable
security definer
set search_path = public
as $$
  select c.id, c.lat, c.lng, c.name, 'plain'::text as state
  from public.complex c
  where c.lat between p_min_lat and p_max_lat
    and c.lng between p_min_lng and p_max_lng
  order by c.lat desc
  limit greatest(coalesce(p_limit, 300), 1);  -- 동시 표시 ≤300 (ADR-003)
$$;

grant execute on function
  public.rpc_create_complex(text, double precision, double precision, text, text),
  public.rpc_markers_in_bbox(double precision, double precision, double precision, double precision, int, int)
to authenticated;
