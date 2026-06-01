# 임장노트 모바일 (Expo)

React Native + Expo (Android 우선). 상태: **REL-001 골격** — 인증·프로필·부부 워크스페이스(생성/초대/수락) + RLS 격리.

스택: expo-router, @supabase/supabase-js, @tanstack/react-query, zustand (ADR-001/002/007).

## 빠른 시작

```bash
cd apps/mobile
npm install
cp .env.example .env   # EXPO_PUBLIC_SUPABASE_URL / ANON_KEY 채우기
npm run start          # Expo Dev Server (Android: npm run android)
```

Supabase 백엔드는 저장소 루트 `supabase/` 참조. 로컬은:

```bash
# 저장소 루트에서
supabase start
supabase db reset      # migrations/0001, 0002 적용 + seed
supabase status        # API URL / anon key 확인 → apps/mobile/.env 에 반영
```

## REL-001 동작 범위

| 화면 | ID | 상태 |
| --- | --- | --- |
| 온보딩/로그인 | D-001 | 이메일 로그인·가입 (FR-AUTH-001~003) |
| 워크스페이스/초대 | D-009 | 생성·초대 코드 발급·수락, 멤버 표시 (FR-WS-001~004) |
| 설정/계정 | D-011 | 프로필 표시, 워크스페이스 진입, 로그아웃 (부분) |
| 지도/피드/즐겨찾기/알림 | D-002/005/008/010 | 스텁 (REL-002~005에서 구현) |

## 구조

```
app/                  expo-router 라우트
  _layout.tsx         Provider + 인증 게이트(FR-AUTH-003)
  (auth)/login.tsx    D-001
  (tabs)/             인증 셸 5탭
  workspace.tsx       D-009 (모달)
src/
  lib/                supabase, queryClient, errors, idempotency
  stores/             authStore (zustand)
  features/           auth, workspace (api + hooks)
  components/         Button, ScreenStub
  theme/              tokens
  types/              database (수동 타입; 운영시 supabase gen types로 대체)
```

## 다음 슬라이스

REL-002(지도/단지/국토부)부터는 `docs/40_delivery/imjang_note_implementation_roadmap.md` 참조.
지도는 ADR-003(WebView + Kakao JS SDK), 국토부는 ADR-004(Edge Function 프록시·캐시).
외부 API 키는 클라이언트에 두지 않는다.
