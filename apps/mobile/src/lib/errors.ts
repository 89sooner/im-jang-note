/**
 * Postgres/Supabase 오류 → 사용자 메시지 매핑 (api_contracts.md §5).
 * RLS 거부/권한 부족을 숨기지 않고 사유를 표시한다(frontend_architecture.md §6).
 */
import type { ApiErrorCode } from '@/types/database';

const MESSAGES: Record<ApiErrorCode, string> = {
  AUTH_INVALID_CREDENTIALS: '이메일 또는 비밀번호가 올바르지 않습니다.',
  AUTH_VALIDATION_FAILED: '입력값을 확인해 주세요.',
  AUTH_SOLE_OWNER_BLOCK: '소유자는 직접 나갈 수 없습니다. 워크스페이스를 삭제하거나 위임하세요.',
  WS_VALIDATION_FAILED: '워크스페이스 이름을 확인해 주세요.',
  WS_FORBIDDEN: '권한이 없습니다. 소유자만 수행할 수 있습니다.',
  WS_CAPACITY_FULL: '워크스페이스 정원(2인)이 가득 찼습니다.',
  WS_INVITE_EXPIRED: '초대 코드가 만료되었거나 유효하지 않습니다.',
  UNKNOWN: '문제가 발생했습니다. 잠시 후 다시 시도해 주세요.',
};

export function toApiErrorCode(error: unknown): ApiErrorCode {
  const message =
    typeof error === 'object' && error !== null && 'message' in error
      ? String((error as { message: unknown }).message)
      : String(error ?? '');
  const found = (Object.keys(MESSAGES) as ApiErrorCode[]).find((code) =>
    message.includes(code),
  );
  return found ?? 'UNKNOWN';
}

export function toUserMessage(error: unknown): string {
  return MESSAGES[toApiErrorCode(error)];
}
