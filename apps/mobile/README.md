# 임장노트 모바일 (Expo)

React Native + Expo (Android 우선). 상태: **REL-001~006 골격** — 인증·워크스페이스부터 지도·노트·실시간 코멘트·검색·알림·오프라인까지.

스택: expo-router · @supabase/supabase-js · @tanstack/react-query(서버상태) · zustand(클라이언트상태) (ADR-001/002/007). 지도는 WebView + Kakao JS SDK(ADR-003).

## 빠른 시작

```bash
cd apps/mobile
npm install
cp .env.example .env    # 아래 env 채우기
npm run start           # Expo Dev Server (Android: npm run android)
npm run typecheck       # tsc --noEmit
```

### 환경변수 (.env)

| 키 | 설명 |
| --- | --- |
| `EXPO_PUBLIC_SUPABASE_URL` | Supabase 프로젝트(또는 `supabase status` 로컬) URL |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | anon 키 (RLS로 보호되므로 공개 가능) |
| `EXPO_PUBLIC_KAKAO_JS_KEY` | Kakao JavaScript 키 (도메인/번들 제한). 없으면 지도가 안내 화면으로 대체 |

> service_role 키, 국토부 서비스키 등은 **앱에 두지 않는다**. Edge Function 시크릿에만 둔다(NFR-002).

백엔드는 저장소 루트 `supabase/` 참조 (`supabase start && supabase db reset`).

## 화면 (D-*) ↔ 슬라이스

| 화면 | ID | 슬라이스 | 요구사항 |
| --- | --- | --- | --- |
| 온보딩/로그인 | D-001 | REL-001 | FR-AUTH-001~003 |
| 워크스페이스/초대 | D-009 | REL-001 | FR-WS-001~004 |
| 지도 홈 | D-002 | REL-002 | FR-MAP-001~005, FR-SEARCH-001 |
| 단지 상세 | D-003 | REL-002/003/005 | FR-DATA-001~004, FR-NOTE-001, FR-FAV-001 |
| 노트 작성/편집 | D-004 | REL-003/006 | FR-NOTE-001~004/006, FR-MEDIA-001, FR-SYNC-001 |
| 노트 목록/피드 | D-005 | REL-003 | FR-NOTE-005 |
| 노트 상세/코멘트 | D-012 | REL-003/004 | FR-NOTE-002/004/006, FR-COMMENT-001 |
| 단지 비교 | D-006 | REL-005 | FR-FAV-002 |
| 검색/필터 | D-007 | REL-005 | FR-SEARCH-001~002 |
| 즐겨찾기 | D-008 | REL-005 | FR-FAV-001/002 |
| 알림 센터 | D-010 | REL-005 | FR-NOTIFY-001~002 |
| 설정/계정 | D-011 | REL-001 | FR-SET-001~002, FR-AUTH-004 |

## 구조

```
app/                       expo-router 라우트
  _layout.tsx              Provider + 인증 게이트 + SyncStatusBadge + outbox
  (auth)/login.tsx         D-001
  (tabs)/                  지도·피드·즐겨찾기·알림·설정 (Realtime 구독 마운트)
  complex/[id].tsx         D-003
  note/edit.tsx, note/[id].tsx   D-004, D-012
  compare.tsx, search.tsx, workspace.tsx   D-006, D-007, D-009
src/
  lib/                     supabase, queryClient, errors, idempotency, telemetry
  stores/                  auth, map, consent, sync (zustand)
  features/
    auth/ workspace/       REL-001
    complex/ map/          REL-002 (지도·국토부 데이터)
    note/                  REL-003 (노트·사진)
    comment/ realtime/     REL-004 (코멘트·Realtime 구독)
    favorite/ search/ notification/ compare/   REL-005
    sync/                  REL-006 (오프라인 outbox + 자동 flush)
  components/              Button, RatingStars(C-004), ChecklistInput(C-005),
                           PhotoGrid(C-006), CommentThread(C-007), FilterSheet(C-009),
                           SearchBar(C-010), CompareTable(C-011), SyncStatusBadge(C-013),
                           FreshnessBadge, ScreenStub
  theme/                   디자인 토큰
  types/                   database (수동 타입; 운영시 supabase gen types로 대체)
```

## 동작 메모

- **상태 경계**: 원격 truth는 React Query, 세션/지도뷰포트/동의/동기화 메타는 zustand, 작성 중 draft는 outbox(영속).
- **실시간**: `(tabs)` 셸이 `ws:<workspace_id>` 채널을 구독해 note/comment/notification 변경을 React Query 캐시 무효화로 흡수(FR-WS-003).
- **오프라인**: 네트워크 끊김 시 노트 저장은 outbox 큐로 적재, 복귀 시 idempotency_key 기반 자동 재생(FR-SYNC-001/002, ADR-005).
- **저하 모드**: 국토부 데이터는 캐시 우선 + "최신 아님" 배지(FreshnessBadge, NFR-004).
- **개인정보**: 사진은 동의 후 EXIF 제거(`exif:false`), 위치는 사용 중에만(ADR-006).

## 참고 문서

- 화면/컴포넌트: `docs/20_derived_ui_specs/`
- API/RPC/Edge 계약: `docs/30_technical_architecture/imjang_note_api_contracts.md`
- 로드맵·검증: `docs/40_delivery/`
