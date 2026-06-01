/**
 * REL-001 도메인 타입.
 * 출처: docs/30_technical_architecture/imjang_note_data_model.md §2,
 *       imjang_note_api_contracts.md (DTO).
 * 실제 운영에서는 `supabase gen types typescript` 로 생성한 타입으로 대체한다.
 */

export type WorkspaceRole = 'owner' | 'partner';

/** ENT-USR-001 user_profile */
export interface UserProfile {
  id: string;
  display_name: string;
  avatar_url: string | null;
  consents: Record<string, unknown>;
  settings: Record<string, unknown>;
  deletion_scheduled_at: string | null;
  created_at: string;
  updated_at: string;
}

/** ENT-WS-001 workspace */
export interface Workspace {
  id: string;
  name: string;
  owner_id: string;
  created_at: string;
  deleted_at: string | null;
}

/** ENT-WS-002 workspace_member */
export interface WorkspaceMember {
  id: string;
  workspace_id: string;
  user_id: string;
  role: WorkspaceRole;
  joined_at: string;
}

/** ENT-WS-003 workspace_invite */
export interface WorkspaceInvite {
  id: string;
  workspace_id: string;
  code: string;
  created_by: string;
  expires_at: string;
  accepted_by: string | null;
  accepted_at: string | null;
  created_at: string;
}

/** ENT-CMP-001 complex */
export interface Complex {
  id: string;
  external_id: string | null;
  name: string;
  address: string | null;
  lat: number;
  lng: number;
  lawd_cd: string | null;
  total_households: number | null;
  build_year: number | null;
  fetched_at: string | null;
  created_at: string;
}

/** API-MAP-001 Marker (rpc_markers_in_bbox 반환) */
export interface Marker {
  complex_id: string;
  lat: number;
  lng: number;
  name: string;
  state: 'plain' | 'has_note' | 'favorite';
}

/** 신선도 메타 (api_contracts §4, NFR-004) */
export interface Freshness {
  fetched_at: string | null;
  is_stale: boolean;
  source: '국토부';
}

/** API-DATA-001 ComplexDetail */
export interface ComplexDetail {
  complex_id: string;
  name: string;
  address: string | null;
  total_households: number | null;
  build_year: number | null;
  lat: number;
  lng: number;
  freshness: Freshness;
}

/** ENT-TX-001 실거래가 항목 */
export interface Transaction {
  deal_date: string;
  area_m2: number;
  floor: number | null;
  price: number; // 만원
}

/** 월별 시세 추이 */
export interface TrendPoint {
  month: string; // YYYY-MM
  avg_price: number;
  count: number;
}

/** API-DATA-002 TransactionList */
export interface TransactionList {
  complex_id: string;
  items: Transaction[];
  trend: TrendPoint[];
  freshness: Freshness;
}

/** 지도 뷰포트 bbox */
export interface BBox {
  minLat: number;
  minLng: number;
  maxLat: number;
  maxLng: number;
}

/** API 오류 모델 (imjang_note_api_contracts.md §5) */
export type ApiErrorCode =
  | 'AUTH_INVALID_CREDENTIALS'
  | 'AUTH_VALIDATION_FAILED'
  | 'AUTH_SOLE_OWNER_BLOCK'
  | 'WS_VALIDATION_FAILED'
  | 'WS_FORBIDDEN'
  | 'WS_CAPACITY_FULL'
  | 'WS_INVITE_EXPIRED'
  | 'MAP_VALIDATION_FAILED'
  | 'MAP_GEOCODE_FAILED'
  | 'DATA_UPSTREAM_UNAVAILABLE'
  | 'DATA_RATE_LIMITED'
  | 'UNKNOWN';
