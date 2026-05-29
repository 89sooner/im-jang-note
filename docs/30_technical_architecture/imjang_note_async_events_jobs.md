# 임장노트 비동기 작업 및 이벤트

## 1. 목적과 범위

이 문서는 임장노트의 잡(JOB-*)과 이벤트(EVT-*)에 대해 큐/스케줄, 생산자/소비자, 재시도/DLQ, 순서/dedupe, 진행 보고, Realtime 채널과 알림 파이프라인(JOB-NOTIFY-001), 실거래가 캐시 갱신 주기를 정의한다. 실행 환경은 Supabase Edge Functions(Deno) + pg_cron/스케줄, Realtime, Storage 트리거이며(ADR-002), API/이벤트 페이로드는 `imjang_note_api_contracts.md` §7, 엔티티는 `imjang_note_data_model.md`를 따른다. 신규 잡/이벤트 발명은 금지하며 잠긴 ID만 사용한다.

원칙: 외부 의존·장시간 작업은 비동기로 분리(NFR-001), 모든 잡은 재시도·DLQ·관측 지표를 가진다(NFR-004/006).

## 2. Job 카탈로그

| Job ID | 작업 | Trigger/스케줄 | Worker | Retry | Timeout | Progress/완료 이벤트 | 관련 FR |
| --- | --- | --- | --- | --- | --- | --- | --- |
| JOB-DATA-001 | 실거래가 캐시 갱신 | pg_cron 스케줄(주기 §6) + on-demand(API-DATA-003) | Edge Fn `refresh_transactions` | 지수 백오프 최대 5회 | 60s/배치 | 완료 시 transaction_cache upsert, is_stale 해제 | FR-DATA-002/004, NFR-004 |
| JOB-DATA-002 | 단지 메타 동기화 | pg_cron 스케줄(저빈도) + 미등록 단지 생성 시 | Edge Fn `sync_complex_meta` | 지수 백오프 최대 5회 | 60s/배치 | complex upsert, fetched_at 갱신 | FR-DATA-001/003 |
| JOB-NOTIFY-001 | 알림 발송 워커 | EVT-NOTE-001/EVT-CMT-001/EVT-WS-001 구독 | Edge Fn `notify_worker` | 최대 3회, 토큰 무효 시 즉시 중단 | 30s | notification 생성 → Expo Push 발송 | FR-NOTIFY-001/002 |
| JOB-MEDIA-001 | 썸네일 생성 | Storage 업로드 객체 생성 트리거 | Edge Fn `thumbnail_worker` | 최대 3회 | 30s | note_photo.thumbnail_path 갱신 | FR-MEDIA-001/002 |

큐 모델: Supabase에서 전용 메시지 브로커 대신 (a) pg_cron 스케줄 잡, (b) Postgres 변경/Realtime 이벤트 구독 워커, (c) Storage 트리거를 사용한다. 작업 상태가 필요한 알림/캐시 갱신은 Postgres 작업 테이블(`job_run`) + 상태 컬럼(pending/running/succeeded/failed/dead)으로 추적한다.

## 3. Event 카탈로그

이벤트는 Realtime 워크스페이스 채널 `ws:<workspace_id>`로 브로드캐스트되며, 잡의 트리거로도 소비된다(API 계약 §7과 일치).

| Event ID | 이름 | Producer | Consumer | Payload | Ordering/Dedupe |
| --- | --- | --- | --- | --- | --- |
| EVT-NOTE-001 | `note.created` | rpc_save_note | feed(D-005)·map(D-002)·JOB-NOTIFY-001 | `{note_id,complex_id,author_id,created_at}` | commit 순서 / note_id |
| EVT-NOTE-002 | `note.updated` | rpc_save_note/delete | note(D-012)·feed | `{note_id,updated_at,deleted?}` | note_id+updated_at |
| EVT-CMT-001 | `comment.created` | rpc_add_comment | note(D-012)·JOB-NOTIFY-001 | `{comment_id,note_id,author_id}` | comment_id |
| EVT-WS-001 | `member.joined` | rpc_accept_invite | workspace(D-009)·JOB-NOTIFY-001 | `{workspace_id,user_id}` | user_id |
| EVT-SYNC-001 | `sync.completed` | sync 재생(클라이언트↔서버) | client sync 스토어(C-013) | `{batch_id,applied,failed}` | batch_id |

생산자/소비자 분리: Realtime UI 소비자는 React Query 캐시 무효화로 흡수(프론트 §4.5). 알림 소비자(JOB-NOTIFY-001)는 동일 이벤트를 받아 알림 파이프라인을 구동한다(§5).

## 4. 실패 처리 (재시도 / DLQ / 순서 / dedupe)

- retryable: 국토부/Kakao/Expo 일시 오류, 타임아웃 → 지수 백오프 재시도(JOB-DATA-* 최대 5, NOTIFY/MEDIA 최대 3).
- non-retryable: 입력 검증 실패, Expo 토큰 무효(DeviceNotRegistered) → 재시도 중단, 토큰 비활성화(device_token.enabled=false).
- dead letter: 재시도 소진 작업은 `job_run` 상태 dead + DLQ 테이블(`job_dead_letter`)에 페이로드·오류 적재. 운영 알림 발생(NFR-006).
- ordering: 노트/코멘트 이벤트는 Postgres commit 순서 보장. 알림은 순서 비보장이나 dedupe로 중복 방지.
- dedupe: 잡은 멱등 키(JOB-DATA-*: (complex_id, deal_date, area_m2, floor, price); NOTIFY: (recipient_id, source_event_id); MEDIA: storage_path)로 중복 처리 방지. 클라이언트 write는 idempotency_key로 중복 재생 방지(FR-SYNC-002).
- user-visible recovery: 사진 썸네일 실패는 원본으로 폴백 + 재생성 표시. 캐시 갱신 실패는 is_stale=true 저하 모드(NFR-004). 알림 실패는 알림 센터(table)에는 정상 기록되고 푸시만 누락.

## 5. Realtime 채널과 알림 파이프라인 (JOB-NOTIFY-001)

알림 파이프라인:
1. 도메인 write(rpc_save_note/rpc_add_comment/rpc_accept_invite)가 트랜잭션 내에서 도메인 변경 + 이벤트 발생(EVT-NOTE-001/EVT-CMT-001/EVT-WS-001).
2. JOB-NOTIFY-001 워커가 해당 이벤트를 구독해 수신자(배우자) 결정: 같은 워크스페이스의 다른 멤버, 작성자 본인 제외.
3. 수신자 설정 확인: `user_profile.settings`/device_token.enabled로 알림 on/off 존중(FR-NOTIFY-002).
4. `notification`(ENT-NOTIFY-001) 레코드 생성 → 알림 센터(D-010)에 즉시 반영(Realtime).
5. device_token(ENT-DEV-001)으로 Expo Push 발송(FR-NOTIFY-001). 토큰 무효 시 비활성화.
6. dedupe: (recipient_id, source_event_id)로 중복 발송 방지.

Realtime 채널: 클라이언트는 활성 워크스페이스 채널 `ws:<workspace_id>`만 구독(테넌시 격리, NFR-002). 노트/코멘트/멤버 변경과 sync 완료(EVT-SYNC-001)를 수신해 피드·노트 상세·동기화 배지(C-013)를 갱신한다(FR-WS-003).

오프라인 동기화 흐름: 온라인 복귀 시 클라이언트 outbox를 idempotent RPC로 재생 → 성공 배치 후 EVT-SYNC-001 수신 → 로컬 큐 정리, 부분실패는 배지로 표시(FR-SYNC-002). 충돌(SYNC_CONFLICT)은 ADR-005 정책 확정 전까지 작성자 단독 편집(FR-NOTE-006)으로 표면적 축소.

## 6. 실거래가 캐시 갱신 주기 및 운영 지표

캐시 갱신 주기(ADR-004로 최종 확정):
- JOB-DATA-001(실거래가): 정기 스케줄(예 일 1회 야간) + 단지 상세 진입 시 신선도 만료면 on-demand 갱신(API-DATA-003). 신규 단지/활성 단지 우선 배치.
- JOB-DATA-002(단지 메타): 저빈도(예 주 1회) + 미등록 단지 생성 직후 1회. 단지 메타는 변경 빈도가 낮아 TTL 길게.
- 쿼터 보호: 국토부 쿼터 내에서 배치 분할·백오프, 초과 시 다음 윈도우로 이연(DATA_RATE_LIMITED).

운영 지표(NFR-006):
- queue/backlog: 대기 `job_run`(pending) 수, 미갱신(is_stale=true) 단지 수.
- job latency: 갱신/알림/썸네일 잡 처리 시간 분포.
- retry rate: 외부 API 실패율, 재시도 횟수 분포.
- DLQ count: `job_dead_letter` 적재 수 → 임계 초과 시 알림.
- 동기화: 오프라인 재생 성공률(목표 99%, SRS §3.2), 부분실패율, sync 완료까지 지연.
- 알림: 푸시 발송 성공률, 무효 토큰 비율.

상세 SLO/알림 룰/대시보드는 observability 문서(타 작업자) 소관이며, 본 문서는 잡/이벤트가 노출하는 지표 원천만 정의한다.
