# 임장노트 UI 컴포넌트 명세서

## 0. 문서 위치와 책임

이 문서는 SRS·IA가 정의한 컴포넌트(C-001~C-015)의 책임·props/data·variant·이벤트·접근성·사용 규칙을 정의한다. 동일 의미의 컴포넌트를 중복 구현하지 않는다(중복 방지). 화면 ID(D-*)·요구사항(FR-*)·플로우(F-*)는 정의된 것만 참조하며 새 컴포넌트를 발명하지 않는다.

## 1. 문서 원칙

- 각 컴포넌트는 단일 책임을 가진다. 유사 기능은 variant로 흡수하고 새 컴포넌트를 만들지 않는다.
- 모든 인터랙티브 컴포넌트는 접근성 책임(label·역할·포커스·터치 타깃·대비)을 명시한다(NFR-005).
- 상태(loading/disabled/selected 등)는 토큰(`imjang_note_design_system_tokens.md`)을 사용한다.
- 색만으로 의미 전달 금지. 텍스트/아이콘 병행.

## 2. 컴포넌트 분류

- 지도·데이터 표면: C-001 MapView, C-002 ComplexMarker/Cluster, C-003 ComplexCard, C-014 PriceHistoryChart.
- 입력·폼: C-004 RatingStars, C-005 ChecklistInput, C-006 PhotoGrid, C-008 NoteForm, C-009 FilterSheet, C-010 SearchBar.
- 협업·피드백: C-007 CommentThread, C-013 SyncStatusBadge, C-015 MemberAvatar, C-012 EmptyState.
- 비교: C-011 CompareTable.

## 3. 중복 방지 규칙

- 단지 요약 표시는 항상 C-003. 지도 미리보기/피드/검색결과/즐겨찾기에서 별도 카드 만들지 않는다(variant로 처리).
- 빈/없음 표시는 항상 C-012. 화면마다 임의 빈 화면 만들지 않는다.
- 오프라인/동기화/부분실패 배지는 항상 C-013. 개별 토스트로 대체하지 않는다.
- 사용자(부부) 표시는 항상 C-015.

---

## C-001 MapView

- 책임: Kakao Map 지도 렌더링·이동·줌·현재 영역(viewport) 노출. (FR-MAP-001/002/005)
- 사용 화면: D-002.
- 필수 props/data: `region`(center/zoom), `markers`(C-002 데이터), `onRegionChange`, `onViewportLoad`, `locationPermission`.
- variant: full(D-002 기본), readonly(결과 미리보기용 비인터랙티브).
- 이벤트: `map.move`, `map.zoom`, `map.loadViewport`(FR-MAP-005).
- 상태: loading_initial(타일/데이터), offline(캐시 타일·범위 안내), recoverable_error.
- 접근성: 지도 영역 landmark·대체 텍스트, 위치 권한 거부 시 키보드/버튼 기반 영역 탐색 폴백, 컨트롤 최소 44pt 터치 타깃.
- 사용 규칙: 지도는 D-002에서만 풀 인터랙티브. 마커는 C-002에 위임.

## C-002 ComplexMarker/Cluster

- 책임: 단지 위치 마커·밀집 시 클러스터·노트 보유 단지 핀 표시. (FR-MAP-003/004, FR-NOTE-005)
- 사용 화면: D-002.
- 필수 props/data: `complexId`, `position`, `count`(cluster), `hasNote`(노트 핀), `selected`.
- variant: marker(단일), cluster(집계), note-pinned(노트 보유 강조).
- 이벤트: `marker.select`(FR-MAP-004), `cluster.expand`.
- 상태: default, selected, note-pinned.
- 접근성: 마커별 접근성 label(단지명·노트 유무), 선택 상태 색+형태 동시 표현.
- 사용 규칙: 다수 마커는 반드시 클러스터링(NFR-001 성능).

## C-003 ComplexCard

- 책임: 단지 요약(이름·주소·핵심 메타·별점 요약) 카드. 단지 표시 단일 컴포넌트.
- 사용 화면: D-002(미리보기 시트), D-003(헤더), D-005/D-007/D-008(리스트 항목), D-006(헤더).
- 필수 props/data: `complex`(id/name/address/meta), `ratingSummary`(C-004), `favorite`, `noteCount`.
- variant: preview(시트), header(상세), list(리스트), compact.
- 이벤트: `card.openDetail`, `favorite.toggle`(FR-FAV-001).
- 상태: loading(skeleton), ready, partial_data(메타 일부 누락).
- 접근성: 카드 전체 단일 터치 타깃·명확한 label, 즐겨찾기 토글 별도 접근성 버튼.
- 사용 규칙: 모든 단지 요약은 이 컴포넌트. 신규 카드 금지.

## C-004 RatingStars

- 책임: 별점 입력(작성) 및 표시(읽기). (FR-NOTE-001)
- 사용 화면: D-004(입력), D-003/D-005/D-006/D-008/D-012(표시).
- 필수 props/data: `value`(0~max), `max`, `editable`, `onChange`.
- variant: input(편집), display(읽기), summary(평균/요약).
- 이벤트: `rating.set`(FR-NOTE-001).
- 상태: default, disabled, empty(미평가).
- 접근성: slider/radiogroup 역할, 숫자값 텍스트 병기(색만으로 전달 금지), 키보드/스크린리더 값 노출.
- 사용 규칙: 별점은 이 컴포넌트만. 점수 표시도 동일.

## C-005 ChecklistInput

- 책임: 교통·학군·소음·채광·관리상태·주변환경 6개 항목 평가 입력/표시. (FR-NOTE-002)
- 사용 화면: D-004(입력), D-012(읽기).
- 필수 props/data: `items`(고정 6항목 키·값), `editable`, `onChange`.
- variant: input, readonly.
- 이벤트: `checklist.update`(FR-NOTE-002).
- 상태: default, partial(일부 미입력), readonly.
- 접근성: 각 항목 label·값 연결, 미입력 항목 명시, 그룹 역할.
- 사용 규칙: 6개 항목은 고정. 항목 추가/삭제로 범위 확장 금지.

## C-006 PhotoGrid

- 책임: 사진 첨부(작성)·그리드 열람(상세). (FR-MEDIA-001 첨부, FR-MEDIA-002 열람)
- 사용 화면: D-004(첨부), D-012(열람).
- 필수 props/data: `photos`(로컬/원격 ref), `editable`, `uploadState`(per item), `onAdd`/`onRemove`/`onView`.
- variant: editable(작성), viewer(열람).
- 이벤트: `photo.add`/`photo.remove`(FR-MEDIA-001), `photo.view`(FR-MEDIA-002).
- 상태: loading(썸네일), operation_pending(업로드중), partial_failure(일부 업로드 실패), offline(로컬 큐).
- 접근성: 각 사진 대체 텍스트, 삭제/추가 버튼 label, 업로드 상태 텍스트 병기.
- 사용 규칙: 사진 표시는 이 컴포넌트만. 오프라인 로컬 큐 상태를 항목별 표현(F-003).

## C-007 CommentThread

- 책임: 노트 코멘트 스레드 표시·작성. (FR-COMMENT-001, F-004)
- 사용 화면: D-012.
- 필수 props/data: `comments`(작성자 C-015·본문·시간), `onAdd`, `realtime`.
- variant: thread(기본).
- 이벤트: `comment.add`, `comment.realtime`(FR-COMMENT-001).
- 상태: empty(첫 코멘트 유도), loading, operation_pending(전송/큐), offline(로컬 큐), recoverable_error.
- 접근성: 코멘트 목록 역할, 새 코멘트 도착 announce(live region), 입력 label.
- 사용 규칙: 코멘트 UI는 이 컴포넌트만. 작성자 표시는 C-015 위임.

## C-008 NoteForm

- 책임: 노트 작성/편집 폼 컨테이너. 별점·체크리스트·사진·구조화 항목·본문을 조립. (FR-NOTE-001~004/006, FR-MEDIA-001)
- 사용 화면: D-004.
- 필수 props/data: `note`(편집 시), `complexContext`, `draftState`, `onDraftSave`, `onSubmit`.
- variant: create, edit.
- 이벤트: `note.draftSave`, `note.save`(FR-NOTE-006).
- 상태: loading_initial(편집 로딩), operation_pending(저장), offline(임시저장), partial_failure, recoverable_error, stale(충돌).
- 접근성: 폼 필드 label·오류 연결, 저장 버튼 상태, 이탈 시 임시저장 확인.
- 사용 규칙: 하위 입력은 C-004/C-005/C-006 재사용. 폼 자체에 중복 입력 위젯 구현 금지.

## C-009 FilterSheet

- 책임: 검색 필터(지역·가격대·평형·체크리스트 항목 등 SRS 범위) 시트. (FR-SEARCH-002)
- 사용 화면: D-007(D-002/D-005/D-008에서 진입).
- 필수 props/data: `filters`, `onApply`, `onReset`, `resultPreviewCount`.
- variant: bottom-sheet(기본), fullscreen(많은 옵션).
- 이벤트: `filter.apply`, `filter.reset`(FR-SEARCH-002).
- 상태: default, applied, loading(미리보기 카운트).
- 접근성: 시트 포커스 트랩·닫기 버튼, 각 필터 label, 적용 전후 결과 수 안내.
- 사용 규칙: 필터 UI는 이 컴포넌트만. 한 손 조작 위해 하단 시트 우선.

## C-010 SearchBar

- 책임: 검색어 입력·검색 진입. (FR-SEARCH-001)
- 사용 화면: D-002, D-007, D-005(피드 검색 진입).
- 필수 props/data: `query`, `onChange`, `onSubmit`, `placeholder`.
- variant: trigger(지도 위 진입 트리거), active(입력 활성).
- 이벤트: `search.open`, `search.query`(FR-SEARCH-001).
- 상태: default, focused, loading(제안).
- 접근성: search 역할, 명확한 label, 지우기 버튼.
- 사용 규칙: 검색 입력은 이 컴포넌트만.

## C-011 CompareTable

- 책임: 단지 다중 비교 테이블(행=속성, 열=단지). (FR-FAV-002, FR-DATA-002, FR-NOTE-003)
- 사용 화면: D-006.
- 필수 props/data: `complexes`(열), `metrics`(행: 속성·실거래가·별점·체크리스트), `onAdd`/`onRemove`.
- variant: table(기본).
- 이벤트: `compare.addComplex`/`compare.removeComplex`, `compare.sortByMetric`.
- 상태: empty(대상<2), loading, partial_failure(누락 셀), stale.
- 접근성: 표 header/scope 연결, 누락 셀 "데이터 없음" 텍스트, 가로 스크롤 시 헤더 고정.
- 사용 규칙: 비교 표는 이 컴포넌트만. 실거래가 미니 표시는 C-014 재사용.

## C-012 EmptyState

- 책임: 빈/없음 상태의 원인과 다음 액션 제공. 전 화면 공통.
- 사용 화면: 전 화면(D-002~D-012의 empty).
- 필수 props/data: `reason`, `primaryAction`, `illustration?`.
- variant: empty(데이터 없음), no-result(검색), no-permission, offline-limited.
- 이벤트: 액션은 화면이 주입.
- 상태: 정적.
- 접근성: 안내 텍스트 가독성, 액션 버튼 label.
- 사용 규칙: 빈 화면은 항상 이 컴포넌트. 임의 빈 화면 금지.

## C-013 SyncStatusBadge

- 책임: 오프라인·동기화중·부분실패·정상 동기화 상태를 전역/화면 상위에 노출. (FR-SYNC-001/002, F-003)
- 사용 화면: 전역 셸 + D-004/D-005/D-012 등 작성·동기화 화면.
- 필수 props/data: `state`(online/offline/syncing/partial_failure/error), `pendingCount`, `onRetry`.
- variant: global(셸 상단), inline(폼/항목별).
- 이벤트: `sync.retry`, `sync.statusView`.
- 상태: online, offline, syncing(operation_pending), partial_failure, error.
- 접근성: 상태 아이콘+텍스트 동시(색만 금지), 대기 항목 수 announce.
- 사용 규칙: 동기화/오프라인 표시는 이 컴포넌트만. 개별 토스트로 대체 금지.

## C-014 PriceHistoryChart

- 책임: 아파트 실거래가 추이 차트. (FR-DATA-002, F-005)
- 사용 화면: D-003(전체), D-006(미니 비교).
- 필수 props/data: `series`(기간별 가격), `unit`, `range`, `dataQuality`(완전/부분/없음).
- variant: full(상세), mini(비교 셀).
- 이벤트: `price.load`, `data.refresh`.
- 상태: loading, empty(거래 없음), stale, partial_failure(구간 누락), offline.
- 접근성: 추이를 색만으로 전달 금지(값·방향 텍스트 요약 병기), 데이터 표 대체 제공.
- 사용 규칙: 실거래가 시각화는 이 컴포넌트만.

## C-015 MemberAvatar

- 책임: 워크스페이스 멤버(부부) 표시. (FR-WS-001/003)
- 사용 화면: D-005/D-009/D-010/D-012/D-003(작성자).
- 필수 props/data: `member`(id/name/avatar), `size`, `presence?`.
- variant: single, stack(멤버 목록).
- 이벤트: `member.open`(D-009 컨텍스트).
- 상태: default, loading.
- 접근성: 멤버명 대체 텍스트, 이니셜 폴백.
- 사용 규칙: 사용자 표시는 이 컴포넌트만.
