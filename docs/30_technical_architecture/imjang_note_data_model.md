# 임장노트 데이터 모델

## 1. 목적과 범위

이 문서는 임장노트의 전체 엔티티(ENT-*)에 대해 컬럼/타입, 관계(ERD 텍스트), 인덱스, RLS 규칙, 생명주기/보존/삭제(소프트 삭제), 테넌시(workspace_id), 마이그레이션 정책, transaction_cache 신선도를 정의한다. 저장소는 Supabase Postgres이며(ADR-002), 권한·트랜잭션은 `imjang_note_backend_architecture.md`, API DTO는 `imjang_note_api_contracts.md`를 따른다. 엔티티 ID/이름은 SRS·태스크에서 잠긴 값만 사용한다.

테넌시 원칙: workspace 종속 엔티티는 모두 `workspace_id`(FK) 컬럼을 가지며 RLS로 워크스페이스 단위 격리된다(NFR-002). 모든 테이블은 RLS enable + 기본 거부.

## 2. 엔티티 카탈로그

| Entity ID | 테이블 | 책임 | 주요 필드 | 소유 모듈 | 관련 FR |
| --- | --- | --- | --- | --- | --- |
| ENT-USR-001 | user_profile | 사용자 프로필·동의·설정 | id(uid), display_name, avatar_url, consents(jsonb), settings(jsonb), deletion_scheduled_at | auth/settings | FR-AUTH-002, FR-SET-001/002 |
| ENT-WS-001 | workspace | 부부 그룹(정원 2) | id, name, owner_id, created_at, deleted_at | workspace | FR-WS-001 |
| ENT-WS-002 | workspace_member | 멤버십·역할 | id, workspace_id, user_id, role(enum owner/partner), joined_at | workspace | FR-WS-002~004 |
| ENT-WS-003 | workspace_invite | 만료 가능 초대 | id, workspace_id, code, expires_at, accepted_by, accepted_at | workspace | FR-WS-002 |
| ENT-CMP-001 | complex | 단지(국토부 메타 캐시) | id, external_id, name, address, lat, lng, total_households, build_year, fetched_at | data/map | FR-DATA-001, FR-MAP-003 |
| ENT-NOTE-001 | note | 임장 노트 | id, workspace_id, complex_id, author_id, visited_at, rating, free_memo, created_by/updated_by, deleted_at, idempotency_key | note | FR-NOTE-001/003/004/006 |
| ENT-NOTE-002 | note_checklist | 체크리스트 항목 | id, note_id, category(enum), score(1~5), memo | note | FR-NOTE-002 |
| ENT-MEDIA-001 | note_photo | 노트 사진 | id, note_id, storage_path, thumbnail_path, width/height, bytes, created_at | media | FR-MEDIA-001/002 |
| ENT-CMT-001 | comment | 노트 코멘트 | id, note_id, author_id, body, created_at, deleted_at | comment | FR-COMMENT-001 |
| ENT-FAV-001 | favorite | 즐겨찾기/후보 | id, workspace_id, complex_id, created_by, created_at | favorite | FR-FAV-001/002 |
| ENT-TX-001 | transaction_cache | 실거래가 캐시 | id, complex_id, deal_date, area_m2, floor, price, fetched_at, is_stale | data | FR-DATA-002/004, NFR-004 |
| ENT-NOTIFY-001 | notification | 알림 항목 | id, workspace_id, recipient_id, type(enum), payload(jsonb), read_at, created_at | notify | FR-NOTIFY-001/002 |
| ENT-DEV-001 | device_token | 푸시 디바이스 토큰 | id, user_id, expo_push_token, enabled, updated_at | notify | FR-NOTIFY-001 |

## 3. 관계 및 일관성 (ERD 텍스트)

```text
auth.users (1) ──< user_profile (1:1, id=uid)
user_profile (1) ──< workspace_member >── (1) workspace        # owner_id → user_profile
workspace (1) ──< workspace_member   (정원 2: role owner 1 + partner ≤1)
workspace (1) ──< workspace_invite
workspace (1) ──< note ──< note_checklist
                    note ──< note_photo
                    note ──< comment
workspace (1) ──< favorite
complex (1) ──< note            (note.complex_id → complex.id)
complex (1) ──< favorite
complex (1) ──< transaction_cache
workspace (1) ──< notification
user_profile (1) ──< device_token
```

일관성 규칙:
- 정원 불변식: `workspace_member`에서 workspace당 행 ≤ 2, role=owner 정확히 1(FR-WS-002). rpc_accept_invite 트랜잭션 + 부분 유니크 제약으로 강제.
- 노트 원자성: note + note_checklist는 rpc_save_note 단일 트랜잭션으로 함께 저장/갱신(FR-NOTE-001/002).
- 참조 무결성: note/favorite/transaction_cache는 complex FK. complex는 국토부 캐시이므로 미등록 단지는 좌표+주소로 생성(FR-MAP-003).
- 강한 일관성: 워크스페이스 내 도메인 write는 Postgres 트랜잭션으로 즉시 일관. 외부 캐시(complex, transaction_cache)는 결과적 일관(신선도 메타로 노출, NFR-004).

## 4. 인덱스 및 조회 패턴

| 엔티티 | 조회 패턴 | 인덱스 | 성능 목표 |
| --- | --- | --- | --- |
| complex | 뷰포트 bbox 마커(API-MAP-001) | GiST(geography(lat,lng)) 공간 인덱스 | 지도 첫 렌더 ≤2.5s(NFR-001) |
| complex | 단지명/주소 검색(API-SEARCH-001) | trigram(name,address) GIN | 검색 응답 빠름 |
| note | 워크스페이스 최신순(API-NOTE-003) | (workspace_id, created_at desc) | 피드 페이지네이션 |
| note | 단지순/단지별 | (workspace_id, complex_id) | 단지별 노트 진입 |
| note_checklist | note 조인 | (note_id) | 노트 상세 |
| comment | note별(API-COMMENT-002) | (note_id, created_at) | 코멘트 목록 |
| favorite | 워크스페이스 목록(API-FAV-001) | (workspace_id, complex_id) unique | 토글 멱등 |
| transaction_cache | 단지+면적+기간(API-DATA-002) | (complex_id, deal_date desc), (complex_id, area_m2) | 실거래 ≤1.5s(캐시 적중) |
| transaction_cache | dedupe | unique(complex_id, deal_date, area_m2, floor, price) | 중복 거래 방지 |
| notification | 수신자 미읽음(API-NOTIFY-001) | (recipient_id, created_at desc), partial(read_at is null) | 알림 센터 |
| workspace_invite | code 조회(API-WS-003) | unique(code) | 초대 수락 |

## 5. RLS 규칙

신뢰 확립: `auth.uid()` → `workspace_member` 조인으로 멤버십 도출. 헬퍼 `is_member(workspace_id)` / `is_owner(workspace_id)` 함수 가정.

| 테이블 | SELECT | INSERT/UPDATE/DELETE |
| --- | --- | --- |
| user_profile | self(id=uid) 또는 같은 워크스페이스 멤버(표시명/아바타 노출) | self만 update |
| workspace | is_member(id) | INSERT: 생성자=owner_id; UPDATE/DELETE: is_owner(id)(FR-WS-004) |
| workspace_member | is_member(workspace_id) | INSERT/DELETE: rpc 경유 owner(정원 검사); self leave 허용 |
| workspace_invite | is_owner(workspace_id) | INSERT: owner; UPDATE(accept): rpc_accept_invite |
| complex | 인증 사용자(공용 캐시) | INSERT: 인증 사용자(미등록 단지 생성); UPDATE: 서버 잡만(JOB-DATA-002) |
| note | is_member(workspace_id), deleted_at is null | INSERT: author_id=uid & is_member; UPDATE/DELETE: author_id=uid OR is_owner(FR-NOTE-006) |
| note_checklist | 부모 note의 정책 상속 | rpc_save_note 경유 |
| note_photo | 부모 note 정책 + Storage 서명 URL | INSERT: author; DELETE: author/owner |
| comment | is_member(note의 workspace) | INSERT: is_member & author_id=uid; DELETE: author/owner |
| favorite | is_member(workspace_id) | INSERT/DELETE: is_member |
| transaction_cache | 인증 사용자 | 서버 잡만(JOB-DATA-001) |
| notification | recipient_id=uid | INSERT: 서버(notify); UPDATE(read): recipient |
| device_token | self(user_id=uid) | self만 |

기본 정책: 모든 테이블 RLS enable, 정책 미일치 시 거부. Storage 버킷(사진)은 비공개 + 서명 URL, 경로에 workspace_id/note_id 포함해 RLS 정책으로 멤버만 접근(NFR-002).

## 6. 생명주기 / 보존 / 삭제 / 백업

- soft delete: note, comment, workspace는 `deleted_at` 소프트 삭제(FR-NOTE-006). 조회 시 `deleted_at is null` 필터. 복구 가능.
- hard delete: 소프트 삭제 후 보존 기간(예 30일, 정책 확정은 운영 문서 소관) 경과 시 정리 잡으로 물리 삭제. 사진 원본/썸네일도 Storage에서 함께 삭제.
- 계정 탈퇴(FR-AUTH-004): `user_profile.deletion_scheduled_at` 설정 후 삭제 예약 잡 실행. 단독 owner면 위임/삭제 요구(AUTH_SOLE_OWNER_BLOCK). 개인 데이터 삭제·동의 철회 반영(NFR-003).
- 개인정보 보존(NFR-003): 위치/사진은 동의 기반 수집(consents jsonb), 최소 수집·보존기간 명시. EXIF 위치 분리는 ADR-006으로 확정.
- idempotency 보존: write RPC의 `idempotency_key`는 (actor, key)로 결과 보존(예 24h 윈도우), 오프라인 재생 중복 방지(FR-SYNC-002). 윈도우 경과 후 정리.
- 백업/복구: Supabase 관리형 PITR/자동 백업 가정(상세는 infrastructure 문서 소관). 소프트 삭제로 사용자 실수 복구, 백업으로 시스템 장애 복구.

## 7. 테넌시 (workspace_id)

- workspace 종속 엔티티(note, note_checklist[부모 경유], note_photo[부모 경유], comment[부모 경유], favorite, notification)는 workspace 경계로 격리. RLS가 단일 강제 지점.
- 공용 캐시(complex, transaction_cache)는 워크스페이스 비종속(공유 메타)이며 read는 인증 사용자 전체 허용, write는 서버 잡 한정.
- 워크스페이스 정원은 2 고정이나 `workspace_member`로 일반화되어 향후 확장 가능(NFR-007).

## 8. 마이그레이션 정책 / transaction_cache 신선도

마이그레이션:
- backward compatible 우선: 컬럼 추가는 nullable/default, 신규 인덱스 CONCURRENTLY. RLS 정책 변경은 단위 테스트 후 적용.
- destructive migration: 컬럼/테이블 삭제는 2단계(deprecate→삭제), API 버저닝(API 계약 §6)과 동기화.
- rollback: 각 마이그레이션은 down 스크립트 보유. 데이터 손실 가능 변경은 백업 스냅샷 후 진행.
- seed/fixture: 개발용 시드(샘플 워크스페이스/단지/노트)는 실제 RLS·DTO 형태와 일치(프론트 테스트 픽스처와 공유).

transaction_cache 신선도(ADR-004):
- `fetched_at`로 신선도 계산, TTL(예 매매 실거래 일 단위, 단지 메타 더 길게)은 ADR-004로 확정.
- 만료 시 JOB-DATA-001(실거래)·JOB-DATA-002(단지 메타)가 갱신. 갱신 실패 시 `is_stale=true`로 표시하고 API freshness에 반영해 클라이언트가 "최신 아님" 저하 모드 노출(NFR-004, FR-DATA-002).
- 동일 거래 중복은 unique(complex_id, deal_date, area_m2, floor, price)로 dedupe(API 계약 §8).
