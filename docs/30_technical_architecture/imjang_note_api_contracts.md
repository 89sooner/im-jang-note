# 임장노트 API 계약

## 1. 목적과 범위

이 문서는 프론트엔드(RN+Expo)와 백엔드(Supabase) 사이, 그리고 외부 연동(국토부 OpenAPI, Kakao REST)과의 계약을 정의한다. Supabase 테이블/RPC + Edge Function 엔드포인트를 API-* 구체 ID로 카탈로그화하고, 요청/응답 DTO, 오류 모델, authz, idempotency, 페이지네이션/필터, Realtime 채널 계약, 국토부 응답→내부 DTO 매핑, 버저닝을 다룬다. 모듈/권한은 `imjang_note_backend_architecture.md`, 엔티티는 `imjang_note_data_model.md`, 이벤트는 `imjang_note_async_events_jobs.md`를 따른다.

전송: PostgREST(테이블/RPC)와 Edge Function(HTTPS)은 모두 TLS + Supabase JWT(Authorization: Bearer)로 호출한다. Realtime은 WSS 채널이다(NFR-002).

## 2. 공통 원칙

1. 조회(read)와 write를 분리한다. read는 PostgREST/Edge GET, write는 RPC(POST)로 표현한다.
2. 모든 write는 client-generated `idempotency_key`(UUID v4)를 받는다. 동일 key 재요청은 기존 결과를 반환하며 중복 생성하지 않는다(FR-SYNC-002).
3. 모든 오류는 기계 판독 `code`와 사용자 조치 힌트(`hint`)를 가진다.
4. 권한/정책 거부는 숨기지 않고 사유(`code` + `hint`)를 제공한다(FR-WS-004).
5. 외부 데이터 응답은 신선도 메타(`fetched_at`, `is_stale`)를 포함한다(NFR-004).
6. authz는 RLS + RPC 멤버십 검증으로 강제하며, 클라이언트 전달 workspace_id는 신뢰하지 않고 서버가 멤버십으로 재검증한다.

## 3. API 카탈로그

표기: PostgREST는 `table:`/RPC는 `rpc:`, Edge Function은 `fn:` 프리픽스. authz는 RLS 정책 + RPC 내부 검사를 의미.

| API ID | Method | Operation | 목적 | Request DTO | Response DTO | Error | Authz | 관련 FR |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| API-AUTH-001 | POST | GoTrue sign-in/up | 로그인·가입·세션 발급 | `{provider,email?,token?}` | `Session{access_token,refresh_token,user}` | AUTH_INVALID_CREDENTIALS | public | FR-AUTH-001/003 |
| API-AUTH-002 | POST | `rpc:rpc_upsert_profile` | 프로필 생성/수정 | `ProfileInput{display_name,avatar_url?}` | `UserProfile` | AUTH_VALIDATION_FAILED | self | FR-AUTH-002 |
| API-AUTH-003 | GET | `table:user_profile` | 내 프로필 조회 | - | `UserProfile` | - | self | FR-AUTH-002 |
| API-AUTH-004 | POST | `rpc:rpc_request_account_deletion` | 탈퇴·데이터 삭제 예약 | `{idempotency_key,reassign_to?}` | `DeletionTicket{scheduled_at}` | AUTH_SOLE_OWNER_BLOCK | self | FR-AUTH-004 |
| API-WS-001 | POST | `rpc:rpc_create_workspace` | 워크스페이스 생성(생성자 owner) | `{name,idempotency_key}` | `Workspace` | WS_VALIDATION_FAILED | auth user | FR-WS-001 |
| API-WS-002 | POST | `rpc:rpc_create_invite` | 만료 가능 초대 발급 | `{workspace_id,ttl,idempotency_key}` | `Invite{code,expires_at}` | WS_FORBIDDEN, WS_CAPACITY_FULL | owner | FR-WS-002 |
| API-WS-003 | POST | `rpc:rpc_accept_invite` | 초대 수락(partner 추가) | `{code,idempotency_key}` | `WorkspaceMember` | WS_INVITE_EXPIRED, WS_CAPACITY_FULL | auth user | FR-WS-002 |
| API-WS-004 | GET | `table:workspace_member` | 멤버 목록 조회 | - | `WorkspaceMember[]` | - | member | FR-WS-003 |
| API-WS-005 | POST | `rpc:rpc_remove_member` | 멤버 제거/워크스페이스 삭제 | `{workspace_id,target_user_id?,idempotency_key}` | `{ok}` | WS_FORBIDDEN | owner | FR-WS-004 |
| API-MAP-001 | GET | `rpc:rpc_markers_in_bbox` | 뷰포트 단지 마커 | `{bbox,zoom}` | `Marker[]{complex_id,lat,lng,state}` | - | member | FR-MAP-001/002/005 |
| API-MAP-002 | GET | `fn:geocode` (Edge) | 주소→좌표(서버 보호) | `{query}` | `GeoPoint[]` | MAP_GEOCODE_FAILED | member | FR-MAP-004, ADR-003 |
| API-MAP-003 | POST | `rpc:rpc_create_complex` | 미등록 단지 신규 생성 | `{name,lat,lng,address,idempotency_key}` | `Complex` | MAP_VALIDATION_FAILED | member | FR-MAP-003 |
| API-DATA-001 | GET | `fn:complex_detail` (Edge) | 단지 기본정보(캐시 우선) | `{complex_id}` | `ComplexDetail` + freshness | DATA_UPSTREAM_UNAVAILABLE | member | FR-DATA-001/003 |
| API-DATA-002 | GET | `fn:transactions` (Edge) | 실거래가 목록·추이(캐시 우선) | `{complex_id,area_range?,period?}` | `TransactionList` + freshness | DATA_UPSTREAM_UNAVAILABLE | member | FR-DATA-002/003/004 |
| API-DATA-003 | POST | `fn:refresh_complex_data` (Edge) | 강제 갱신 트리거 | `{complex_id}` | `{job_id}` | DATA_RATE_LIMITED | member | FR-DATA-003 |
| API-NOTE-001 | POST | `rpc:rpc_save_note` | 노트+체크리스트 원자 저장 | `NoteInput` | `Note` | NOTE_VALIDATION_FAILED, NOTE_FORBIDDEN | author/owner | FR-NOTE-001~004/006 |
| API-NOTE-002 | POST | `rpc:rpc_delete_note` | 노트 소프트 삭제 | `{note_id,idempotency_key}` | `{ok}` | NOTE_FORBIDDEN | author/owner | FR-NOTE-006 |
| API-NOTE-003 | GET | `table:note` (filtered) | 노트 목록(최신/단지순, 페이지네이션) | `{sort,cursor,complex_id?}` | `Page<NoteSummary>` | - | member | FR-NOTE-005 |
| API-NOTE-004 | GET | `table:note` (+joins) | 노트 상세(체크리스트/사진) | `{note_id}` | `NoteDetail` | NOTE_NOT_FOUND | member | FR-NOTE-002/004 |
| API-MEDIA-001 | POST | `fn:media_upload_url` (Edge) | 사진 업로드 서명 URL 발급·메타 | `{note_id,count,idempotency_key}` | `{upload_urls[],photo_ids[]}` | MEDIA_LIMIT_EXCEEDED | author | FR-MEDIA-001 |
| API-COMMENT-001 | POST | `rpc:rpc_add_comment` | 코멘트 작성 | `{note_id,body,idempotency_key}` | `Comment` | COMMENT_VALIDATION_FAILED | member | FR-COMMENT-001 |
| API-COMMENT-002 | GET | `table:comment` | 코멘트 목록 | `{note_id,cursor}` | `Page<Comment>` | - | member | FR-COMMENT-001 |
| API-FAV-001 | GET | `table:favorite` | 즐겨찾기/후보 목록 | `{workspace_id}` | `Favorite[]` | - | member | FR-FAV-001 |
| API-FAV-002 | POST | `rpc:rpc_toggle_favorite` | 즐겨찾기 토글 | `{complex_id,idempotency_key}` | `Favorite` | - | member | FR-FAV-001 |
| API-SEARCH-001 | GET | `fn:search` (Edge) | 지역/주소/단지명 검색 | `{query,bbox?}` | `SearchResult[]` | - | member | FR-SEARCH-001 |
| API-SEARCH-002 | GET | `fn:search` (Edge) | 가격/평형/평점 필터 | `{filters}` | `SearchResult[]` | - | member | FR-SEARCH-002 |
| API-NOTIFY-001 | GET | `table:notification` | 알림 센터 목록 | `{workspace_id,cursor}` | `Page<Notification>` | - | member | FR-NOTIFY-002 |
| API-NOTIFY-002 | POST | `rpc:rpc_register_device` | 디바이스 토큰 등록/설정 | `{expo_push_token,enabled,idempotency_key}` | `DeviceToken` | - | self | FR-NOTIFY-001/002 |
| API-SET-001 | POST | `rpc:rpc_update_settings` | 앱 설정·동의 상태 변경 | `SettingsInput{notify,map,lang,consents}` | `Settings` | SET_VALIDATION_FAILED | self | FR-SET-001/002, NFR-003 |

비교(D-006)는 새 엔드포인트 없이 API-FAV-001 + API-DATA-002 + API-NOTE-003 조합으로 구성한다(FR-FAV-002, 범위 추가 없음).

## 4. DTO 표준과 주요 DTO

- ID는 stable canonical UUID. 시간은 ISO-8601(UTC). enum은 문서화 값만 허용. optional과 nullable을 구분한다.

핵심 DTO 스케치(필드 상세 타입은 `imjang_note_data_model.md`):

- `NoteInput`: `{ note_id?, complex_id, workspace_id, visited_at, rating(1~5), checklist: ChecklistItem[], free_memo(maxlen), photo_ids?[], idempotency_key }`.
- `ChecklistItem`: `{ category: enum('교통','학군','소음','채광','관리상태','주변환경'), score(1~5), memo? }` (FR-NOTE-002).
- `NoteSummary`: `{ note_id, complex_id, author: MemberRef, rating, visited_at, thumbnail_url?, comment_count }`.
- `NoteDetail`: `NoteSummary` + `{ checklist[], free_memo, photos: Photo[] }`.
- `ComplexDetail`: `{ complex_id, name, address, total_households?, build_year?, ... , freshness }` (FR-DATA-001).
- `TransactionList`: `{ complex_id, items: Transaction[]{ deal_date, area_m2, floor, price }, trend, freshness }` (FR-DATA-002).
- `freshness`: `{ fetched_at, is_stale: boolean, source: '국토부' }` (NFR-004).
- `Marker`: `{ complex_id, lat, lng, state: enum('plain','has_note','favorite') }` (FR-MAP-005, 색+형상으로 NFR-005 충족).

## 5. 오류 모델

전 모듈 공통 형태: `{ code, message, hint, details? }`. code는 `<MODULE>_<REASON>`.

| Error Code | Transport | 의미 | 사용자 조치 |
| --- | --- | --- | --- |
| AUTH_INVALID_CREDENTIALS | 401 | 자격 증명 실패 | 다시 로그인 |
| AUTH_SOLE_OWNER_BLOCK | 409 | 단독 owner 탈퇴 차단 | 위임/워크스페이스 삭제 후 재시도(FR-AUTH-004) |
| WS_CAPACITY_FULL | 409 | 정원 2 초과 | 기존 멤버 제거 필요(FR-WS-002) |
| WS_INVITE_EXPIRED | 410 | 초대 만료 | owner에게 재발급 요청 |
| WS_FORBIDDEN | 403 | 역할 권한 부족 | owner만 가능(FR-WS-004) |
| NOTE_FORBIDDEN | 403 | 작성자/owner 아님 | 본인 노트만 수정·삭제(FR-NOTE-006) |
| NOTE_VALIDATION_FAILED | 400 | 입력 오류 | 필드 사유 확인 |
| MEDIA_LIMIT_EXCEEDED | 422 | 용량/개수 초과 | 사진 수/용량 줄이기(FR-MEDIA-001) |
| DATA_UPSTREAM_UNAVAILABLE | 503 | 국토부 장애 | 캐시(최신 아님) 표시, 후 재시도(NFR-004) |
| DATA_RATE_LIMITED | 429 | 쿼터 초과 | 잠시 후 재시도 |
| MAP_GEOCODE_FAILED | 502 | 지오코딩 실패 | 좌표 직접 지정(FR-MAP-003) |
| SYNC_CONFLICT | 409 | 오프라인 충돌 | ADR-005 정책에 따른 선택 제시(FR-SYNC-002) |

## 6. authz / idempotency / 페이지네이션·필터 / 버저닝

- authz: read는 RLS(같은 workspace 멤버), write RPC는 SECURITY DEFINER 내부에서 `auth.uid()`→`workspace_member` 검증 + 역할/소유자 정책. 클라이언트 전달 workspace_id 비신뢰.
- idempotency: 모든 write RPC는 `idempotency_key` 필수. 서버는 (key, actor) 단위로 결과를 보존/재반환(보존 윈도우는 데이터 모델 §6). 오프라인 재생 안전성 보장(FR-SYNC-002).
- 페이지네이션: 목록(API-NOTE-003, API-COMMENT-002, API-NOTIFY-001)은 cursor 기반(`{cursor,limit}`) `Page<T>{items,next_cursor}`. 정렬은 `sort=latest|by_complex`(FR-NOTE-005).
- 필터: 실거래(API-DATA-002)는 `area_range`(전용면적/평형)·`period`(FR-DATA-004). 검색(API-SEARCH-002)은 `price_range`·`area`·`rating_min`(FR-SEARCH-002).
- 버저닝: Edge Function은 경로 프리픽스 `/v1/*`로 버저닝. PostgREST 스키마 변경은 backward-compatible 우선(데이터 모델 §마이그레이션). 파괴적 변경 시 `/v2` 신설 후 듀얼 운영.

## 7. Realtime / Event 계약

채널: 워크스페이스당 단일 채널 `ws:<workspace_id>`. 클라이언트는 활성 워크스페이스 채널만 구독(테넌시 격리, NFR-002). 페이로드는 Postgres 변경(`postgres_changes`) 또는 broadcast.

| Event ID | Event Name | Producer | Consumer | Payload | Ordering/Dedupe |
| --- | --- | --- | --- | --- | --- |
| EVT-NOTE-001 | `note.created` | rpc_save_note | feed(D-005), map(D-002) | `{note_id,complex_id,author_id,created_at}` | commit 순서, note_id dedupe |
| EVT-NOTE-002 | `note.updated` | rpc_save_note/delete | note(D-012), feed | `{note_id,updated_at,deleted?}` | note_id+updated_at |
| EVT-CMT-001 | `comment.created` | rpc_add_comment | note(D-012) | `{comment_id,note_id,author_id}` | comment_id dedupe |
| EVT-WS-001 | `member.joined` | rpc_accept_invite | workspace(D-009), notify | `{workspace_id,user_id}` | user_id dedupe |
| EVT-SYNC-001 | `sync.completed` | sync 재생 완료 | client sync 스토어 | `{batch_id,applied,failed}` | batch_id dedupe |

소비자는 이벤트를 React Query 캐시 무효화로 흡수한다(프론트 문서 §4.5). 알림 파이프라인(JOB-NOTIFY-001)과의 연계는 `imjang_note_async_events_jobs.md` 참조.

## 8. 국토부 응답 → 내부 DTO 매핑

Edge Function이 국토부 OpenAPI 원천 응답을 내부 DTO로 정규화하고 Postgres 캐시(complex, transaction_cache)에 upsert한다(FR-DATA-003). 매핑은 정규화 어댑터로 캡슐화해 공급자 교체에 대비한다(NFR-007).

| 원천(국토부) | 내부 필드 | 비고 |
| --- | --- | --- |
| 공동주택 단지 기본정보(단지식별자/단지명/주소/세대수/사용승인일 등) | `complex.external_id / name / address / total_households / build_year` | external_id 없으면 좌표+주소 해시로 내부 식별(SRS §5.1) |
| 아파트 매매 실거래가(거래금액/전용면적/층/계약년월일) | `transaction_cache.price / area_m2 / floor / deal_date` | 금액 단위 정규화(만원→원), 평형 구간 파생 |
| 응답 수신 시각 | `*.fetched_at` | 신선도 계산 기준(ADR-004) |

정규화 규칙: 금액/면적 단위 표준화, 결측 필드 nullable 처리, 거래 중복은 (complex, deal_date, area_m2, floor, price) 키로 dedupe. 캐시 신선도/TTL은 ADR-004로 확정한다.
