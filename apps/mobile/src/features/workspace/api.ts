/**
 * 워크스페이스 API (API-WS-001~005).
 * 모든 쓰기는 RPC 경유(직접 INSERT는 RLS로 차단). idempotency_key 동반.
 */
import { supabase } from '@/lib/supabase';
import { newIdempotencyKey } from '@/lib/idempotency';
import type { Workspace, WorkspaceInvite, WorkspaceMember } from '@/types/database';

/** API-WS-004 내가 속한 워크스페이스 목록 (멤버십 조인) */
export async function fetchMyWorkspaces(): Promise<
  Array<{ workspace: Workspace; role: WorkspaceMember['role'] }>
> {
  const { data, error } = await supabase
    .from('workspace_member')
    .select('role, workspace:workspace_id (*)')
    .order('joined_at', { ascending: true });
  if (error) throw error;
  return (data ?? []).map((row: any) => ({
    role: row.role,
    workspace: row.workspace as Workspace,
  }));
}

/** API-WS-004 멤버 목록 */
export async function fetchMembers(workspaceId: string): Promise<WorkspaceMember[]> {
  const { data, error } = await supabase
    .from('workspace_member')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('joined_at', { ascending: true });
  if (error) throw error;
  return (data ?? []) as WorkspaceMember[];
}

/** API-WS-001 워크스페이스 생성 (FR-WS-001) */
export async function createWorkspace(name: string): Promise<Workspace> {
  const { data, error } = await supabase.rpc('rpc_create_workspace', {
    p_name: name,
    p_idempotency_key: newIdempotencyKey(),
  });
  if (error) throw error;
  return data as Workspace;
}

/** API-WS-002 초대 코드 발급 (FR-WS-002) */
export async function createInvite(
  workspaceId: string,
  ttlMinutes = 1440,
): Promise<WorkspaceInvite> {
  const { data, error } = await supabase.rpc('rpc_create_invite', {
    p_workspace_id: workspaceId,
    p_ttl_minutes: ttlMinutes,
    p_idempotency_key: newIdempotencyKey(),
  });
  if (error) throw error;
  return data as WorkspaceInvite;
}

/** API-WS-003 초대 수락 (FR-WS-002) */
export async function acceptInvite(code: string): Promise<WorkspaceMember> {
  const { data, error } = await supabase.rpc('rpc_accept_invite', {
    p_code: code,
    p_idempotency_key: newIdempotencyKey(),
  });
  if (error) throw error;
  return data as WorkspaceMember;
}
