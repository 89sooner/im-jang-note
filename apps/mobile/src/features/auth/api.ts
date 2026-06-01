/**
 * 인증/프로필 API (API-AUTH-001/002/003).
 */
import { supabase } from '@/lib/supabase';
import type { UserProfile } from '@/types/database';

/** API-AUTH-001 이메일 로그인 (FR-AUTH-001) */
export async function signInWithPassword(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

/** API-AUTH-001 이메일 가입 (FR-AUTH-001). display_name은 트리거가 기본값 생성 */
export async function signUpWithPassword(
  email: string,
  password: string,
  displayName?: string,
) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: displayName ? { display_name: displayName } : undefined },
  });
  if (error) throw error;
  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

/** API-AUTH-003 내 프로필 조회 (FR-AUTH-002) */
export async function fetchMyProfile(): Promise<UserProfile | null> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return null;
  const { data, error } = await supabase
    .from('user_profile')
    .select('*')
    .eq('id', auth.user.id)
    .maybeSingle();
  if (error) throw error;
  return data as UserProfile | null;
}

/** API-AUTH-002 프로필 생성/수정 (FR-AUTH-002) */
export async function upsertProfile(
  displayName: string,
  avatarUrl?: string,
): Promise<UserProfile> {
  const { data, error } = await supabase.rpc('rpc_upsert_profile', {
    p_display_name: displayName,
    p_avatar_url: avatarUrl ?? null,
  });
  if (error) throw error;
  return data as UserProfile;
}
