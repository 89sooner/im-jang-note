# 임장노트 프론트엔드 아키텍처

## 1. 목적과 범위

이 문서는 임장노트 클라이언트(React Native + Expo, Android 우선)의 라우팅, 렌더링/내비게이션 모델, 서버상태/클라이언트상태 경계, 지도 렌더·데이터 페치, 폼/오류/로딩 모델, 오프라인 캐시(FR-SYNC), 접근성/성능 예산, 테스트 전략을 정의한다. 화면 ID(D-001~D-012)와 컴포넌트 ID(C-*), 플로우 ID(F-*)는 `../20_derived_ui_specs/imjang_note_product_ia.md`에서 정의된 것만 사용한다. 새 제품 범위를 추가하지 않으며, API 계약은 `imjang_note_api_contracts.md`, 시스템 경계는 `imjang_note_system_architecture.md`를 따른다.

확정 스택은 ADR-001(RN+Expo), ADR-002(Supabase), ADR-007(React Query+Zustand)으로 잠겨 있다. 지도 연동 방식(ADR-003), 오프라인 충돌 정책(ADR-005), 동의 범위(ADR-006)는 미해결이며, 본 문서는 그 결정에 종속되는 부분을 명시한다.

## 2. 기술 스택 가정

| 항목 | 결정 | 근거/ADR |
| --- | --- | --- |
| Framework | React Native + Expo (managed workflow), Android 우선 | ADR-001 |
| Language | TypeScript (strict) | ADR-001 |
| Routing | expo-router(파일 기반) 가정. 탭/스택 구조가 IA(§4~5)와 1:1 매핑되고 딥링크(F-002/F-008)에 유리 | ADR-001 |
| Server state | @tanstack/react-query | ADR-007, NFR-001 |
| Client state | Zustand | ADR-007 |
| 지도 | Kakao Map (SDK 또는 WebView 브리지) | ADR-003(open) |
| 알림 | expo-notifications | FR-NOTIFY-001/002 |
| 오프라인 영속 | SQLite(expo-sqlite) 기반 outbox 큐 + React Query persist | FR-SYNC-001/002, ADR-005 |
| 백엔드 SDK | @supabase/supabase-js (Auth/Postgres/Realtime/Storage) | ADR-002 |

렌더링 모드: 단일 클라이언트 렌더(CSR) 네이티브 앱. SSR/SSG 없음. 데이터는 React Query를 통해 fetch-on-mount + 캐시 + 백그라운드 재검증(stale-while-revalidate)으로 가져온다.

내비게이션 모델: 인증 게이트 → 하단 탭 셸(5탭) → 탭 내부 push 스택 → 모달/시트. expo-router 그룹 가정: `(auth)`(비인증), `(tabs)`(인증 셸), 그 외 push 라우트. 비인증 사용자는 `(auth)`로만 접근 가능하며 세션 만료 시 D-001로 안전 전환한다(FR-AUTH-003).

## 3. 라우트/화면 매핑

expo-router 가정 라우트 트리(파일 경로는 구현 가이드이며 IA의 표면 정의 §4와 일치).

| Route(가정) | 화면 ID | 화면명 | 관련 요구사항 | Rendering | 주요 데이터 출처(API ID) |
| --- | --- | --- | --- | --- | --- |
| `(auth)/login` | D-001 | 온보딩/로그인 | FR-AUTH-001~003, FR-WS-001/002 | CSR | API-AUTH-001/002, API-WS-001/002 |
| `(tabs)/map` | D-002 | 지도 홈 | FR-MAP-001~005, FR-NOTE-005, FR-SEARCH-001 | CSR | API-MAP-001/002, API-NOTE-003, API-FAV-001 |
| `complex/[id]` | D-003 | 단지 상세 | FR-DATA-001~004, FR-NOTE-001, FR-FAV-001 | CSR | API-DATA-001/002/003, API-NOTE-003, API-FAV-002 |
| `note/edit/[id?]` | D-004 | 노트 작성/편집 | FR-NOTE-001~004/006, FR-MEDIA-001, FR-SYNC-001 | CSR | API-NOTE-001/002, API-MEDIA-001 |
| `(tabs)/feed` | D-005 | 노트 목록/피드 | FR-NOTE-005, FR-WS-003, FR-SYNC-002 | CSR | API-NOTE-003, Realtime(EVT-NOTE-001/002) |
| `compare` | D-006 | 단지 비교 | FR-FAV-002, FR-DATA-002, FR-NOTE-003 | CSR | API-FAV-001, API-DATA-002, API-NOTE-003 |
| `search` | D-007 | 검색/필터 | FR-SEARCH-001~002, FR-DATA-004 | CSR(시트/풀스크린) | API-SEARCH-001/002, API-MAP-003 |
| `(tabs)/favorites` | D-008 | 즐겨찾기/후보 | FR-FAV-001/002 | CSR | API-FAV-001/002 |
| `workspace` | D-009 | 워크스페이스/공유·초대 | FR-WS-001~004, FR-AUTH-004 | CSR | API-WS-001~005 |
| `(tabs)/notifications` | D-010 | 알림 센터 | FR-NOTIFY-001~002 | CSR | API-NOTIFY-001/002, Realtime |
| `(tabs)/settings` | D-011 | 설정/계정/개인정보 | FR-SET-001~002, FR-AUTH-004, FR-DATA-003, NFR-003/006 | CSR | API-AUTH-002/003, API-SET-001 |
| `note/[id]` | D-012 | 노트 상세/코멘트 | FR-NOTE-002/004/006, FR-COMMENT-001, FR-MEDIA-002 | CSR | API-NOTE-004, API-COMMENT-001/002, Realtime(EVT-CMT-001) |

딥링크: 초대 수락(F-002)은 `workspace?invite=<code>`로, 알림 탭(F-008)은 payload의 `target_route`로 D-012/D-009/D-005로 라우팅한다.

## 4. 상태 경계 (React Query / Zustand)

서버상태와 클라이언트상태를 엄격히 분리한다(ADR-007). 원칙: "원격 truth는 React Query, 로컬 ephemeral/세션은 Zustand, 작성 중 draft는 영속 outbox".

### 4.1 Server state (React Query)

원격 데이터 소유. queryKey 네임스페이스를 워크스페이스 단위로 격리해 워크스페이스 전환 시 캐시 누수를 막는다.

| 도메인 | queryKey(예시) | 출처 | 무효화 트리거 |
| --- | --- | --- | --- |
| 단지 마커 | `['markers', wsId, bbox, zoom]` | API-MAP-001 | 뷰포트 변경, 노트/즐겨찾기 변경 |
| 단지 상세 | `['complex', complexId]` | API-DATA-001 | 단지 메타 동기화(JOB-DATA-002) |
| 실거래가 | `['transactions', complexId, filter]` | API-DATA-002 | 캐시 신선도 만료 표시 |
| 노트 목록 | `['notes', wsId, sort, page]` | API-NOTE-003 | EVT-NOTE-001/002, mutation |
| 노트 상세 | `['note', noteId]` | API-NOTE-004 | EVT-NOTE-002 |
| 코멘트 | `['comments', noteId]` | API-COMMENT-001 | EVT-CMT-001 |
| 즐겨찾기 | `['favorites', wsId]` | API-FAV-001 | 토글 mutation |
| 알림 | `['notifications', wsId]` | API-NOTIFY-001 | Realtime, 푸시 수신 |

Realtime 구독 결과는 직접 컴포넌트 상태로 두지 않고 `queryClient.invalidateQueries` 또는 `setQueryData`로 React Query 캐시에 반영해 단일 진실원을 유지한다(FR-WS-003).

### 4.2 Client state (Zustand)

- 세션/현재 워크스페이스: `auth` 스토어(사용자, 활성 workspace_id, 멤버 역할 owner/partner).
- 지도 뷰포트: `map` 스토어(center, zoom, bbox, 선택 마커). 빈번 변경이므로 서버상태와 분리(NFR-001).
- 동의/권한 상태: `consent` 스토어(위치/사진/푸시/관측 동의, NFR-003, ADR-006).
- 오프라인 큐 메타: `sync` 스토어(온라인 여부, 대기 작업 수, 마지막 동기화 시각, 부분실패 플래그) → C-013 SyncStatusBadge 구동(FR-SYNC-002).
- 앱 설정: `settings` 스토어(알림 on/off, 지도 옵션, 언어 — FR-SET-001).

### 4.3 URL/Route state

- 라우트 파라미터(`complexId`, `noteId`, `invite` 코드)와 탭 선택은 expo-router가 소유. 딥링크 복원 시 진실원.

### 4.4 Form/draft state

- D-004 노트 작성은 react-hook-form 가정으로 폼 로컬 상태 관리. 저장 시 SQLite outbox에 draft를 영속화해 앱 종료/오프라인에도 유실 없음(FR-SYNC-001).

### 4.5 Realtime event state

- Supabase Realtime 워크스페이스 채널 구독(`ws:<workspace_id>`). 수신 이벤트(EVT-NOTE-001/002, EVT-CMT-001, EVT-WS-001, EVT-SYNC-001)는 React Query 캐시 무효화로 흡수(§4.1). 채널 계약은 `imjang_note_api_contracts.md` §7.

## 5. 컴포넌트 소유권

컴포넌트 ID는 `../20_derived_ui_specs/imjang_note_ui_component_spec.md`의 정의를 따른다(신규 발명 금지). 주요 소유 경계:

| 컴포넌트 ID | 컴포넌트 | 책임 | 소유 영역 |
| --- | --- | --- | --- |
| C-013 | SyncStatusBadge | 오프라인/동기화중/부분실패 표시 | app shell(전역) |
| C-015 | MemberAvatar | 작성자/코멘트 작성자 협업 표시 | feed/note/comment |
| C-010 | SearchBar | 검색/필터 진입 | D-002 → D-007 |
| (지도) | MapView + MarkerCluster | 마커 렌더·클러스터링 | D-002/D-003 지도 레이어 |
| (폼) | ChecklistField/RatingStars/PhotoPicker | 구조화 입력 | D-004 |

지도 레이어는 ADR-003 결정에 따라 SDK 네이티브 뷰 또는 WebView 브리지로 캡슐화하고, 상위는 동일 props(markers, viewport, onMarkerPress) 인터페이스를 본다(NFR-007 어댑터 경계).

## 6. 오류/로딩/권한/오프라인 모델

상태 분류는 `../20_derived_ui_specs/imjang_note_screen_state_matrix.md`의 taxonomy를 따른다.

- loading_initial: 스켈레톤(지도/리스트). React Query `isPending` 기준.
- empty: 노트 0건/검색 결과 0건은 빈 상태 + 작성 CTA(D-005/D-007).
- recoverable_error: 네트워크/타임아웃은 재시도 버튼 + 기계판독 code(API 계약 §5).
- no_permission: RLS 거부/역할 부족(예 partner의 워크스페이스 삭제)은 숨기지 않고 사유 표시(FR-WS-004).
- auth_expired: 세션 만료 시 D-001로 안전 전환, 진행 중 draft는 outbox 보존(FR-AUTH-003).
- stale/partial data: 실거래/단지 메타 캐시가 신선도 만료면 "최신 아님" 저하 모드 배지(NFR-004, FR-DATA-003).
- offline: 읽기는 React Query persist 캐시로 제공, 쓰기는 outbox 적재(FR-SYNC-001).
- operation_pending: 노트 저장/즐겨찾기 토글은 낙관적 업데이트(optimistic) 후 동기화 결과로 확정/롤백(NFR-001).

### 6.1 오프라인 캐시·동기화 (FR-SYNC)

- 읽기 캐시: React Query를 SQLite/AsyncStorage로 persist해 오프라인 재열람 지원.
- 쓰기 outbox: 노트 작성/수정/삭제, 코멘트, 즐겨찾기 토글, 사진 업로드 메타를 outbox에 기록. 각 항목은 client-generated `idempotency_key`(UUID) 보유.
- 재생: 온라인 복귀(NetInfo) 시 FIFO로 재생, 서버는 idempotency_key로 중복 제거(API 계약 §2). 성공 시 EVT-SYNC-001 수신/로컬 정리.
- 충돌: 동시편집 충돌 해소는 ADR-005 확정 전까지 노트는 작성자 단독 편집(FR-NOTE-006)으로 표면적 축소. 충돌 감지 시 사용자에게 선택지를 제시하는 자리만 마련.
- 사진: 오프라인 캡처 사진은 로컬 파일 URI로 보관, 온라인 시 Storage 업로드 후 note_photo 레코드 확정(FR-MEDIA-001).

## 7. 접근성 및 성능 기준

접근성(NFR-005):
- 최소 44pt 터치 타깃, 한 손 도달 영역에 주요 액션 배치(IA §3.6).
- 스크린리더 레이블: 마커/별점/체크리스트/아바타에 accessibilityLabel 부여, 색만으로 상태 전달 금지(노트보유/즐겨찾기 마커는 색+형상, FR-MAP-005).
- 동적 글자 크기(allowFontScaling) 대응, WCAG AA 명도 대비.
- focus/selected/disabled 시각 상태는 토큰(`imjang_note_design_system_tokens.md`) 사용.

성능 예산(NFR-001):
- 지도 첫 렌더 ≤ 2.5s(LTE): 초기 마커 쿼리 bbox 제한 + 클러스터링(FR-MAP-002).
- 마커 1,000개 근접 60fps: 뷰포트 기반 마커 윈도잉 + 클러스터, 리렌더 최소화.
- 노트 저장 ≤ 1s(온라인): 낙관적 업데이트로 체감 지연 제거.
- 실거래가 표시 ≤ 1.5s(캐시 적중): 서버 캐시 우선 조회(API-DATA-002).
- 리스트(피드/검색/즐겨찾기) virtualization: FlashList/FlatList windowing.

## 8. 테스트 전략

| 계층 | 범위 | 도구(가정) |
| --- | --- | --- |
| Unit | Zustand 스토어 로직, outbox 큐 재생/idempotency, DTO 변환, 날짜/필터 유틸 | Jest |
| Component | 폼(D-004) 검증·오류 상태, 상태 매트릭스 렌더(빈/오류/오프라인/저하모드) | RNTL |
| Integration | React Query 캐시 무효화 ↔ Realtime 이벤트, 낙관적 업데이트 롤백, MSW로 Supabase/Edge Fn 모킹 | Jest + MSW |
| E2E | 핵심 플로우 F-001(지도→단지→노트→피드), F-002(초대 수락), F-003(오프라인 작성→동기화) | Detox/Maestro |

목/픽스처는 `imjang_note_api_contracts.md`의 DTO와 동일 형태로 작성해 실제 API 교체 경로를 보장한다. 접근성 회귀는 QA 체크리스트(`../20_derived_ui_specs/imjang_note_screen_qa_checklist.md`)를 게이트로 사용한다.
