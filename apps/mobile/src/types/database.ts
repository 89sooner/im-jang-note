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

/** API 오류 모델 (imjang_note_api_contracts.md §5) */
export type ApiErrorCode =
  | 'AUTH_INVALID_CREDENTIALS'
  | 'AUTH_VALIDATION_FAILED'
  | 'AUTH_SOLE_OWNER_BLOCK'
  | 'WS_VALIDATION_FAILED'
  | 'WS_FORBIDDEN'
  | 'WS_CAPACITY_FULL'
  | 'WS_INVITE_EXPIRED'
  | 'UNKNOWN';
