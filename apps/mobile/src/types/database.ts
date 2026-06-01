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

/** 체크리스트 카테고리 (api_contracts §4, FR-NOTE-002) */
export type ChecklistCategory =
  | '교통'
  | '학군'
  | '소음'
  | '채광'
  | '관리상태'
  | '주변환경';

export const CHECKLIST_CATEGORIES: ChecklistCategory[] = [
  '교통',
  '학군',
  '소음',
  '채광',
  '관리상태',
  '주변환경',
];

export interface ChecklistItem {
  category: ChecklistCategory;
  score: number; // 1~5
  memo?: string;
}

/** ENT-MEDIA-001 note_photo */
export interface Photo {
  id: string;
  storage_path: string;
  thumbnail_path: string | null;
  signed_url?: string;
}

/** 멤버 참조 */
export interface MemberRef {
  user_id: string;
  display_name: string;
  role: WorkspaceRole;
}

/** API-NOTE-003 NoteSummary */
export interface NoteSummary {
  note_id: string;
  workspace_id: string;
  complex_id: string;
  author_id: string;
  rating: number;
  visited_at: string;
  free_memo: string;
  created_at: string;
}

/** API-NOTE-004 NoteDetail = NoteSummary + 체크리스트/사진 */
export interface NoteDetail extends NoteSummary {
  checklist: ChecklistItem[];
  photos: Photo[];
}

/** API-NOTE-001 NoteInput */
export interface NoteInput {
  note_id?: string;
  workspace_id: string;
  complex_id: string;
  visited_at: string;
  rating: number;
  free_memo: string;
  checklist: ChecklistItem[];
}

/** API-MEDIA-001 업로드 URL 응답 */
export interface UploadUrl {
  photo_id: string;
  path: string;
  signed_url: string;
  token: string;
}

/** ENT-CMT-001 comment (API-COMMENT-001/002) */
export interface Comment {
  id: string;
  note_id: string;
  workspace_id: string;
  author_id: string;
  body: string;
  created_at: string;
}

/** ENT-FAV-001 favorite (API-FAV-001) */
export interface Favorite {
  id: string;
  workspace_id: string;
  complex_id: string;
  created_at: string;
}

/** API-SEARCH-001/002 SearchResult */
export interface SearchResult {
  complex_id: string;
  name: string;
  address: string | null;
  lat: number;
  lng: number;
}

/** 검색 필터 (api_contracts §필터, FR-SEARCH-002) */
export interface SearchFilters {
  price_range?: [number, number];
  area?: [number, number];
  rating_min?: number;
}

export type NotificationType = 'note_created' | 'comment_created' | 'member_joined';

/** ENT-NOTIFY-001 notification (API-NOTIFY-001) */
export interface AppNotification {
  id: string;
  workspace_id: string;
  recipient_id: string;
  type: NotificationType;
  payload: Record<string, unknown>;
  read_at: string | null;
  created_at: string;
}

/** ENT-DEV-001 device_token (API-NOTIFY-002) */
export interface DeviceToken {
  id: string;
  user_id: string;
  expo_push_token: string;
  enabled: boolean;
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
  | 'NOTE_VALIDATION_FAILED'
  | 'NOTE_FORBIDDEN'
  | 'NOTE_NOT_FOUND'
  | 'MEDIA_LIMIT_EXCEEDED'
  | 'COMMENT_VALIDATION_FAILED'
  | 'UNKNOWN';
