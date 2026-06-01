# 임장노트 백엔드 아키텍처

## 1. 목적과 범위

이 문서는 임장노트 백엔드(Supabase: Postgres + Auth(GoTrue) + RLS + Realtime + Storage + Edge Functions(Deno))의 모듈/도메인 경계, 권한·정책·감사, 동기/비동기 오케스트레이션, 외부 연동(국토부 OpenAPI, Kakao Map REST), 트랜잭션 경계, 실패 처리를 정의한다. 모듈은 SRS의 FR-*에 매핑되며, 데이터는 `imjang_note_data_model.md`, API는 `imjang_note_api_contracts.md`, 비동기는 `imjang_note_async_events_jobs.md`로 위임한다. 새 제품 범위는 추가하지 않는다.

확정 스택은 ADR-002(Supabase), ADR-007(상태관리)로 잠겨 있고, 캐싱(ADR-004), 오프라인 충돌(ADR-005), 동의 범위(ADR-006)는 미해결이다. 별도 BFF/API Gateway를 두지 않고 Postgres(RLS+RPC) + Edge Function을 직접 백엔드로 사용한다(시스템 문서 §7 트레이드오프).

## 2. 모듈 맵

논리 모듈은 Postgres 스키마 객체(테이블/RPC/정책) 묶음 + 해당 Edge Function으로 구성된다.

| 모듈 | 책임 | 관련 요구사항 | API | 데이터(ENT) |
| --- | --- | --- | --- | --- |
| auth | 로그인·세션·프로필·탈퇴 예약 | FR-AUTH-001~004 | API-AUTH-001~004 | ENT-USR-001 |
| workspace | 워크스페이스 생성·초대·멤버·역할 | FR-WS-001~004 | API-WS-001~005 | ENT-WS-001/002/003 |
| map | 뷰포트 마커·마커 상태색·미등록 단지 생성 | FR-MAP-001~005 | API-MAP-001~003 | ENT-CMP-001, ENT-NOTE-001, ENT-FAV-001 |
| data(국토부 프록시) | 단지 메타·실거래가 프록시·정규화·캐시 | FR-DATA-001~004 | API-DATA-001~003 | ENT-CMP-001, ENT-TX-001 |
| note | 노트 생성/조회/수정/삭제·체크리스트·별점·메모 | FR-NOTE-001~006 | API-NOTE-001~004 | ENT-NOTE-001/002 |
| media | 사진 업로드·썸네일·풀스크린 | FR-MEDIA-001~002 | API-MEDIA-001 | ENT-MEDIA-001 |
| comment | 노트 코멘트·실시간 | FR-COMMENT-001 | API-COMMENT-001 | ENT-CMT-001 |
| favorite | 즐겨찾기 토글·비교 | FR-FAV-001~002 | API-FAV-001~002 | ENT-FAV-001 |
| search | 지역/단지명 검색·필터 | FR-SEARCH-001~002 | API-SEARCH-001~002 | ENT-CMP-001, ENT-NOTE-001 |
| notify | 알림 생성·발송·센터·설정 | FR-NOTIFY-001~002 | API-NOTIFY-001~002 | ENT-NOTIFY-001, ENT-DEV-001 |
| sync | 오프라인 작업 재생·idempotency | FR-SYNC-001~002 | (note/media/comment/fav RPC 재사용) | 다수 |
| settings | 앱 설정·동의 상태 | FR-SET-001~002 | API-SET-001 | ENT-USR-001 |

도메인 소유권: 각 테이블은 단일 모듈이 write를 소유한다. 교차 모듈 read는 RLS가 허용하는 범위에서만 허용한다.

## 3. 동기/비동기 경계와 트랜잭션

기본 원칙: 단순 read는 Postgres 직접 쿼리(PostgREST), 다단계/불변식이 있는 write는 Postgres RPC(PL/pgSQL, SECURITY DEFINER + 명시적 멤버십 검증)로 캡슐화해 단일 트랜잭션으로 처리한다. 외부 의존·장시간 작업은 Edge Function/스케줄 잡으로 비동기 처리한다.

| 작업 | 방식 | Job/Event | 트랜잭션 경계 | 사용자 피드백 |
| --- | --- | --- | --- | --- |
| 노트 저장(노트+체크리스트+사진메타) | sync RPC `rpc_save_note` | EVT-NOTE-001/002 | 단일 TX(노트+note_checklist 원자적) | 낙관적 업데이트→확정 |
| 초대 수락(멤버 추가+정원 검사) | sync RPC `rpc_accept_invite` | EVT-WS-001 | 단일 TX(정원 2 불변식, 만료 검사) | 성공/거부 사유 |
| 즐겨찾기 토글 | sync RPC `rpc_toggle_favorite` | - | 단일 TX(upsert/delete) | 낙관적 |
| 코멘트 작성 | sync RPC `rpc_add_comment` | EVT-CMT-001 | 단일 TX | 낙관적→실시간 |
| 실거래가/단지 메타 조회 | sync Edge Fn(캐시 우선) | JOB-DATA-001/002 | 캐시 read, miss 시 원천 fetch | 캐시 신선도 표시 |
| 실거래가 캐시 갱신 | async 스케줄 잡 | JOB-DATA-001 | upsert transaction_cache | 백그라운드 |
| 단지 메타 동기화 | async 스케줄 잡 | JOB-DATA-002 | upsert complex | 백그라운드 |
| 알림 발송 | async 워커 | JOB-NOTIFY-001 | notification 생성→Expo Push | 알림 센터 반영 |
| 썸네일 생성 | async(Storage 트리거) | JOB-MEDIA-001 | note_photo 썸네일 경로 갱신 | 갤러리 표시 |
| 오프라인 큐 재생 | sync RPC 재호출(idempotent) | EVT-SYNC-001 | 항목별 단일 TX | 동기화 배지(C-013) |

오케스트레이션: 클라이언트 멀티스텝(예 노트+사진)은 클라이언트가 순서대로 호출하되 각 단계가 독립 idempotent. 서버측 멀티스텝 불변식(정원, 원자적 노트 저장)은 RPC 한 트랜잭션 안에서 강제한다.

## 4. 권한/정책/감사

테넌시는 `workspace_id` 기준 RLS로 격리한다(NFR-002). 신뢰 확립: JWT `auth.uid()` → `workspace_member`(ENT-WS-002) 조인으로 멤버십·역할(owner/partner)을 서버에서 검증. 클라이언트는 RLS를 우회할 수 없다.

모든 write action은 다음을 정의한다.

- actor context: `auth.uid()` + 활성 workspace_id + 역할(owner/partner).
- resource context: 대상 행의 `workspace_id`/`author_id`/`owner_id`.
- permission check: RLS 정책(기본 거부). 같은 워크스페이스 멤버만 read; write는 소유자 규칙 적용.
- policy check(불변식): 워크스페이스 정원 2(FR-WS-002); 노트 수정/삭제는 작성자 또는 owner(FR-NOTE-006); 워크스페이스 삭제·멤버 제거는 owner 한정(FR-WS-004); 동의 없는 위치/사진 수집 거부(NFR-003, ADR-006).
- idempotency key: 모든 write RPC는 client-generated key 수용, 중복 재생 무시(FR-SYNC-002). 데이터 모델 §보존 참조.
- audit event: write는 `created_by`/`updated_by`/`deleted_by` + 타임스탬프 기록. 멤버십 변경·삭제·탈퇴는 감사 대상(SRS §5.3). 상세 감사 모델은 security 문서(타 작업자) 소관이며 본 문서는 후크 지점만 명시.
- rollback/recovery: RPC는 트랜잭션 실패 시 전체 롤백. 클라이언트는 낙관적 업데이트 롤백. 삭제는 소프트 삭제(복구 가능, 데이터 모델 §6).

RLS 정책 요약(상세 SQL은 `imjang_note_data_model.md` §5):
- read: `workspace_id IN (현재 사용자의 멤버십 워크스페이스)`.
- note write: `author_id = auth.uid()` 또는 (수정/삭제 시) owner.
- workspace 관리: owner 역할 필요.
- 기본 정책: 모든 테이블 RLS enable, 정책 미일치 시 거부.

## 5. 외부 연동

| 연동 | 목적 | 인증 | rate limit/쿼터 | 장애 모드 |
| --- | --- | --- | --- | --- |
| 국토부 공동주택 단지 기본정보 | 단지 메타(FR-DATA-001) | 서비스키(Edge Fn env) | 일일 호출 쿼터, 백오프 | 캐시(complex) stale 폴백 + 저하 모드(NFR-004) |
| 국토부 아파트 매매 실거래가 | 실거래/시세(FR-DATA-002/004) | 서비스키(Edge Fn env) | 월/일 쿼터, 지역·기간 단위 배치 | transaction_cache stale 폴백 + "최신 아님" 표시 |
| Kakao Map REST(지오코딩) | 주소→좌표, 미등록 단지 생성(FR-MAP-003) | REST 키(Edge Fn env, ADR-003) | Kakao 쿼터 | 좌표 수동 입력 폴백 |
| Expo Push Service | 푸시 발송(FR-NOTIFY-001) | Access token(env) | Expo 제한 | 재시도→DLQ, 알림센터는 정상 |
| Supabase Storage | 사진 원본/썸네일 | 서명 URL/RLS | - | 업로드 재시도, outbox 보존 |

연동 원칙(FR-DATA-003): 클라이언트는 국토부/Kakao REST를 직접 호출하지 않는다. Edge Function이 키 보관·프록시·정규화·캐시한다. 정규화는 국토부 응답 → 내부 DTO(API 계약 §국토부 매핑)로 변환하고 Postgres 캐시(complex, transaction_cache)에 upsert한다. 캐싱 전략(TTL/신선도)은 ADR-004로 확정한다.

장애 처리: 외부 호출은 타임아웃 + 지수 백오프 재시도. 재시도 소진 시 캐시 폴백 후 신선도 메타데이터(`fetched_at`, `is_stale`)를 응답에 포함해 클라이언트가 저하 모드를 표시한다(NFR-004).

## 6. 실패 처리

- validation failure: RPC/Edge Fn 입력 검증 실패 → `*_VALIDATION_FAILED`(400류) + 필드별 사유(API 계약 §5). 상태 변경 없음.
- auth failure: 미인증/만료 → 401류, 클라이언트는 D-001 전환(FR-AUTH-003).
- permission/policy failure: RLS·역할 거부 → 403류, 사유 노출(숨기지 않음, FR-WS-004).
- dependency timeout: 국토부/Kakao 타임아웃 → 캐시 폴백 또는 저하 모드 응답(NFR-004).
- partial failure: 노트+사진 다단계에서 사진 업로드 일부 실패 → 노트는 저장, 실패 사진은 outbox 재시도 + 부분실패 배지(C-013).
- retry exhausted: 알림/캐시 갱신 잡 재시도 소진 → DLQ 적재 + 관측 알림(비동기 문서 §4, NFR-006).
- idempotency 충돌: 동일 key 재요청은 기존 결과 반환(중복 생성 금지, FR-SYNC-002).
