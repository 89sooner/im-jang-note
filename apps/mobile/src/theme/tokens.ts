/**
 * 디자인 토큰 (요약). 전체 정의는
 * docs/20_derived_ui_specs/imjang_note_design_system_tokens.md.
 * 야외·한 손 조작·WCAG AA 대비 고려(NFR-005).
 */
export const tokens = {
  color: {
    bg: '#FFFFFF',
    surface: '#F5F6F8',
    text: '#16181D',
    textMuted: '#5B616E',
    primary: '#1F6FEB',
    primaryText: '#FFFFFF',
    danger: '#D7263D',
    border: '#E2E5EA',
    success: '#1A7F4B',
    warning: '#B26A00',
  },
  space: { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 },
  radius: { sm: 8, md: 12, lg: 16 },
  touchTarget: 44, // 최소 터치 타깃(NFR-005)
  font: { sm: 13, md: 15, lg: 18, xl: 24 },
} as const;
