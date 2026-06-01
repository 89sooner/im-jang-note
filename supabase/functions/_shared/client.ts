// Supabase 클라이언트 생성 헬퍼.
// - adminClient(): SERVICE_ROLE 키로 RLS 우회(캐시 upsert/JOB-DATA-002 용).
// - requireUser(req): Authorization Bearer JWT 검증, 미인증이면 AuthError throw.
// 외부 비밀(MOLIT_SERVICE_KEY)이나 SERVICE_ROLE 키는 절대 응답에 노출하지 않는다.

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/** requireUser 실패 시 던지는 미인증 오류(상위에서 401 매핑). */
export class AuthError extends Error {
  readonly code = "UNAUTHENTICATED";
  constructor(message = "인증이 필요합니다.") {
    super(message);
    this.name = "AuthError";
  }
}

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

/** SERVICE_ROLE 클라이언트(RLS 우회). 캐시 테이블 upsert에 사용. */
export function adminClient(): SupabaseClient {
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    throw new Error("SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY 미설정");
  }
  return createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/**
 * Authorization Bearer JWT를 검증하고 인증 사용자를 반환한다.
 * anon 클라이언트 + auth.getUser(jwt)로 검증하며, 실패 시 AuthError throw.
 */
export async function requireUser(
  req: Request,
): Promise<{ id: string; email?: string }> {
  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!token) throw new AuthError();

  const anon = createClient(SUPABASE_URL, ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await anon.auth.getUser(token);
  if (error || !data?.user) throw new AuthError();

  return { id: data.user.id, email: data.user.email ?? undefined };
}
