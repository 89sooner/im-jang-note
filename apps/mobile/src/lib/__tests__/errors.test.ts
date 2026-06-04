import { toApiErrorCode, toUserMessage } from '../errors';

describe('errors → user message 매핑 (api_contracts §5)', () => {
  it.each([
    ['WS_CAPACITY_FULL', '정원'],
    ['WS_FORBIDDEN', '권한'],
    ['WS_INVITE_EXPIRED', '초대'],
    ['NOTE_FORBIDDEN', '수정'],
    ['DATA_UPSTREAM_UNAVAILABLE', '국토부'],
    ['MEDIA_LIMIT_EXCEEDED', '10장'],
    ['COMMENT_VALIDATION_FAILED', '코멘트'],
  ])('%s → 사용자 메시지에 "%s" 포함', (code, hint) => {
    const msg = toUserMessage(new Error(code));
    expect(msg).toEqual(expect.stringContaining(hint));
  });

  it('알 수 없는 오류는 UNKNOWN 코드로 매핑', () => {
    expect(toApiErrorCode(new Error('something weird'))).toBe('UNKNOWN');
  });

  it('null/undefined 도 처리', () => {
    expect(toApiErrorCode(undefined)).toBe('UNKNOWN');
    expect(toUserMessage(null)).toBeTruthy();
  });
});
