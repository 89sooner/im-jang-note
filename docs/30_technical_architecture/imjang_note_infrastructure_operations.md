# 임장노트 인프라 및 운영 아키텍처

## 1. 목적과 범위

이 문서는 임장노트의 환경 구성(dev/prod), Supabase 프로젝트 토폴로지, Edge Function 배포, Expo EAS 빌드/배포 채널, 시크릿/구성 관리, 스케일링, 마이그레이션·백업·복구·롤백·DR을 정의한다. 확정 스택은 ADR-001(RN+Expo), ADR-002(Supabase)이며 관련 NFR은 NFR-004(신뢰성), NFR-007(이식성)이다. 새 제품 범위를 추가하지 않으며 상위 구조는 `imjang_note_system_architecture.md`, 보안/시크릿 원칙은 `imjang_note_security_privacy_architecture.md`를 따른다.

## 2. 환경

dev/prod 2환경 분리를 기본으로 하며, 로컬 개발은 Supabase CLI 로컬 스택을 사용한다. dev/prod는 의도된 차이(데이터, 키, 채널)만 가진다.

| Environment | 목적 | 데이터 | 접근 | 배포 방식 |
| --- | --- | --- | --- | --- |
| local | 개발/단위검증 | fixture/seed | 개발자 | Supabase CLI 로컬 스택 + Expo dev client |
| dev | 통합 검증/QA | 비식별 샘플, dev 외부 키 | 개발/QA 제한 | 자동 배포(브랜치 → dev), EAS `preview` 채널 |
| prod | 운영 | 실데이터, prod 외부 키 | 운영 정책(최소 권한) | 태그/승인 배포, EAS `production` 채널 |

원칙: dev/prod는 별도 Supabase 프로젝트로 완전 격리한다(DB, Auth, Storage, secret, Edge Function 모두 분리). 실데이터는 dev로 복사하지 않는다(NFR-003). 외부 API 키는 환경별로 분리 발급한다.

## 3. Supabase 프로젝트 토폴로지

| Unit | 책임 | Scale 기준 | Health Check | Rollback |
| --- | --- | --- | --- | --- |
| Postgres + RLS + RPC | 도메인 영속성, 권한 격리, 트랜잭션 write | 관리형(인스턴스 등급 상향), 커넥션 풀(pooler) | Supabase 상태/쿼리 지연 | 마이그레이션 down + PITR |
| Auth (GoTrue) | 인증·세션·JWT | 관리형 | 로그인 성공률 | 구성 롤백 |
| Storage | 사진 원본/썸네일, 서명 URL | 관리형(용량/대역) | 업로드/다운로드 성공률 | 버킷 정책 롤백 |
| Realtime | 워크스페이스 변경 브로드캐스트 | 관리형(동시 연결) | 채널 연결률 | 구성 롤백 |
| Edge Functions (Deno) | 외부 API 프록시·캐시, 알림 발송, 썸네일 트리거 | 관리형(동시 실행/콜드스타트) | 함수 호출 성공률 | 이전 버전 재배포 |
| Scheduled (pg_cron/Edge schedule) | JOB-DATA-001/002, JOB-NOTIFY-001, JOB-MEDIA-001 | 큐 적체/실행시간 | 잡 heartbeat | 스케줄 비활성 + 재배포 |

- dev/prod 각각 위 단위를 동일 형상으로 보유한다(NFR-007 이식성). 토폴로지 차이는 인스턴스 등급/쿼터뿐이다.
- 커넥션: 모바일 클라이언트는 anon/JWT로 PostgREST·Realtime에 연결하고, Edge Function은 service_role로 내부 접근한다.

## 4. Backing Services

- Database: Supabase Postgres(RLS, RPC). PITR(Point-In-Time Recovery) 활성.
- Cache: 외부 데이터(단지 메타/실거래)는 Postgres 캐시 테이블(ENT-CMP-001, ENT-TX-001)에 TTL/신선도 메타와 함께 저장(ADR-004). 별도 인메모리 캐시는 두지 않는다.
- Queue: 경량 작업은 pg_cron + 잡 상태 테이블 + Edge schedule로 처리(JOB-*). 별도 메시지 브로커는 도입하지 않는다(운영 단순화, 비동기 문서 §5).
- Object storage: Supabase Storage 비공개 버킷(사진 원본/썸네일), 서명 URL 접근.
- Secret store: Supabase Edge Function secret(env) + CI secret. 환경별 분리(§2, 보안 문서 §4).
- Realtime gateway: Supabase Realtime(워크스페이스 채널).
- Push: Expo Push Service(클라이언트 expo-notifications, 서버 JOB-NOTIFY-001).

## 5. Edge Function 배포

- 소스: 저장소의 `supabase/functions/*`(Deno). 배포는 Supabase CLI(`supabase functions deploy`)로 환경별 프로젝트에 수행.
- 파이프라인: 브랜치 머지 → CI에서 lint/test → dev 배포 → 검증 → 태그/승인 → prod 배포.
- 시크릿: 함수 환경변수로 주입(`supabase secrets set`), 코드/번들에 하드코딩 금지.
- 무중단/롤백: 함수는 버전 단위로 교체되며 문제 시 이전 버전 재배포로 롤백. 함수 변경과 DB 마이그레이션이 함께 필요한 경우 마이그레이션 선배포(하위호환) 후 함수 배포 순서를 지킨다(§7).

## 6. Expo EAS 빌드/배포 채널

- 빌드: Expo EAS Build(Android 우선, APK/AAB). iOS는 NFR-007 이식성 범위로 후속.
- 채널 전략:
  - `preview` 채널 → dev Supabase를 가리키는 빌드, 내부 QA 배포.
  - `production` 채널 → prod Supabase를 가리키는 스토어 빌드.
- OTA 업데이트: EAS Update로 JS 번들 OTA 배포. 네이티브 변경(SDK 키, 권한)은 신규 빌드 필요. OTA 채널과 런타임 버전을 매핑해 호환 깨짐을 방지한다.
- 환경 결정: 앱은 채널/빌드 구성으로 Supabase URL·anon key·Kakao SDK 키를 주입받는다(시크릿 아님은 §2 기준).

## 7. 운영 절차

### deploy
- 백엔드: 마이그레이션(하위호환) → Edge Function → 검증. dev 선배포 후 prod 승인 배포.
- 앱: EAS Build/Update를 채널별로 배포. 스토어 심사 리드타임 고려.

### migration
- 도구: Supabase CLI 마이그레이션(`supabase db push` / 마이그레이션 파일 버전관리).
- 정책: 확장 우선(expand) → 코드 전환 → 정리(contract)의 2단계로 하위호환 마이그레이션. 파괴적 변경은 PITR/백업 확인 후 유예 적용.
- 선행조건: RLS 정책·인덱스 변경은 마이그레이션에 포함하고 적용 후 정책 테스트(보안 문서 §3) 통과 필수.

### rollback
- 코드/함수: 이전 Edge Function 버전 및 이전 EAS Update로 즉시 롤백.
- 스키마: 가역 마이그레이션은 down 적용. 비가역/데이터 손상 시 PITR로 복원.
- 트리거: 핵심 SLO 위반·마이그레이션 실패·교차 워크스페이스 노출 의심 시 롤백(관측 문서 §4, 검증 문서 §4).

### backup/restore
- Postgres: 일일 자동 백업 + PITR. 정기 복원 리허설로 RPO/RTO 검증.
- Storage: 객체 버킷 백업/버전 정책. 사진 손실 시 복원 절차.
- 복원 검증: 복원 후 RLS·서명 URL·잡 스케줄 정상 동작 확인.

### disaster recovery
- 단일 관리형 의존(Supabase) 장애 시: 앱은 저하 모드(오프라인 큐, 캐시 read)로 핵심 열람 유지(NFR-004). 복구 후 오프라인 큐 idempotent 재생(FR-SYNC-001/002).
- 목표: RPO 24h 이내(일일 백업+PITR), RTO는 관리형 복구 시간 기준으로 정의·리허설.
- 외부 원천(국토부) 장애는 DR이 아닌 저하 모드/캐시 폴백으로 처리(관측 문서 §5).

### scheduled cleanup
- 동의 철회/삭제 요청에 따른 하드 삭제 Job(보안 문서 §7): 유예기간 경과 데이터·Storage 객체 정리, 완료 감사.
- 캐시 정리: 만료 TTL 초과 transaction_cache 정리, 신선도 메타 갱신(JOB-DATA-001).
- 토큰 정리: 비활성 device_token 정리(ENT-DEV-001).

## 8. 스케일링 / 용량

- 관리형 수직 확장 중심: Postgres 인스턴스 등급·커넥션 풀, Storage 용량, Edge Function 동시 실행으로 대응. 부부 2인 워크스페이스 다수라는 트래픽 특성상 단순 확장으로 충분.
- 외부 호출: 국토부 쿼터는 캐시 우선·배치(JOB-DATA-001/002)로 절감, 백오프·레이트 제한 적용(NFR-004).
- 한계/모니터: 동시 연결·잡 적체·함수 콜드스타트를 관측 지표로 추적(관측 문서 §2).

## 9. 요구사항 추적
- 환경/토폴로지/이식성: NFR-007, ADR-002
- 신뢰성/백업/DR/저하모드: NFR-004, FR-SYNC-001/002
- 시크릿/구성: NFR-002 (보안 문서 §4)
- 외부 캐시/배치: FR-DATA-003, ADR-004, JOB-DATA-001/002
- 알림/미디어 잡: JOB-NOTIFY-001, JOB-MEDIA-001
