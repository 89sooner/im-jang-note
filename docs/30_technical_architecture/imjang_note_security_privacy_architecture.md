# 임장노트 보안 및 개인정보 아키텍처

## 1. 목적과 범위

이 문서는 임장노트의 신뢰 경계(trust boundary), 인증(authn)/인가(authz), 시크릿 관리, 권한 모델(owner/partner), 감사(audit), 데이터 분류, 개인정보(PIPA) 동의·철회·삭제 흐름, 위협 모델·오남용 사례, Storage 서명 URL 정책을 정의한다. 모든 결정은 `../10_requirements/srs_final.md`/`prd.md`의 승인 범위 안에서만 유효하며 새 제품 범위를 추가하지 않는다. 관련 NFR은 NFR-002(보안), NFR-003(개인정보)이며, 미해결 결정은 ADR-006(위치/개인정보 동의 범위)이다. 상위 런타임 구조는 `imjang_note_system_architecture.md`, 권한이 적용되는 엔티티는 `imjang_note_data_model.md`, 외부 키 프록시는 `imjang_note_backend_architecture.md`를 따른다.

## 2. Trust Boundaries

| ID | Boundary | 신뢰 수준 | 통제 | 관련 요구사항 |
| --- | --- | --- | --- | --- |
| TB-01 | RN+Expo 앱 (디바이스) | untrusted | TLS, JWT 보관(보안 저장소), 클라이언트 입력 불신, 외부 키 비포함 | NFR-002 |
| TB-02 | Supabase Auth (GoTrue) | controlled | JWT 발급·갱신·만료, 비밀번호 정책, 소셜 OAuth | FR-AUTH-001/003 |
| TB-03 | Postgres + RLS | trusted | `auth.uid()` 기반 RLS, 기본 거부, `workspace_member` 멤버십 검증 | FR-WS-004, NFR-002 |
| TB-04 | Postgres RPC (PL/pgSQL) | trusted | `security definer` 최소화, 트랜잭션 경계, 입력 검증 | FR-NOTE-001, FR-WS-002 |
| TB-05 | Storage (객체) | controlled | 버킷 비공개, 서명 URL, 경로 기반 워크스페이스 격리 | FR-MEDIA-001/002, NFR-002 |
| TB-06 | Edge Functions (Deno) | trusted | service_role 한정, 외부 키 환경변수 보관, egress 제한 | FR-DATA-003, NFR-002 |
| TB-07 | 외부 API (국토부/Kakao/Expo Push) | external/untrusted | 서버 프록시 경유, 키 비노출, 응답 검증·정규화, 백오프 | FR-DATA-003, NFR-004 |

핵심 원칙: 앱(TB-01)은 어떤 외부 비밀도 보관하지 않고 Postgres RLS(TB-03)를 우회할 수 없다. 클라이언트 → 외부 데이터 원천 직접 호출은 금지하며 반드시 Edge Function(TB-06)을 경유한다. Kakao Map 렌더 SDK 키만 예외적으로 앱에 포함되며(ADR-003), 도메인/패키지 제한으로 완화한다.

## 3. 인증/인가 모델

### 3.1 인증 (Authentication)

- principal: Supabase Auth 사용자(`auth.uid()`), 앱 세션은 GoTrue가 발급한 JWT(access + refresh).
- 메커니즘: 이메일/비밀번호 또는 소셜 OAuth(FR-AUTH-001). access token 만료 시 refresh 자동 갱신, refresh 만료 시 D-001 로그인 화면 전환(FR-AUTH-003).
- 토큰 보관: 앱은 OS 보안 저장소(Android Keystore/expo-secure-store)에 refresh token 보관. 메모리 외 평문 저장 금지.
- 로그아웃/세션 폐기: 사용자 요청 또는 디바이스 분실 시 세션 무효화(FR-AUTH-004). device_token(ENT-DEV-001)도 함께 해지.

### 3.2 인가 (Authorization)

워크스페이스 단위 테넌시 격리를 RLS로 강제한다(NFR-002, FR-WS-004).

- role: `owner`, `partner` (워크스페이스 정원 2인, ENT-WS-002 workspace_member.role).
- resource: ENT-NOTE-001 note, ENT-NOTE-002 note_checklist, ENT-MEDIA-001 note_photo, ENT-CMT-001 comment, ENT-FAV-001 favorite, ENT-NOTIFY-001 notification 등 모든 워크스페이스 스코프 엔티티.
- permission: read/create/update/delete, 워크스페이스 관리(초대 발급/취소/멤버 제거), 동의·삭제 요청.
- policy: 모든 정책은 기본 거부(deny by default). 허용 조건은 `EXISTS (SELECT 1 FROM workspace_member m WHERE m.workspace_id = row.workspace_id AND m.user_id = auth.uid())`로 멤버십을 확인한다.

#### 권한 매트릭스 (owner vs partner)

| 작업 | owner | partner | 정책 근거 |
| --- | --- | --- | --- |
| 워크스페이스 노트/사진/코멘트 read | 허용 | 허용 | 멤버십(FR-WS-004) |
| 노트 작성/수정/삭제 | 본인 작성분 | 본인 작성분 | 작성자 단독 편집(FR-NOTE-006), 충돌 표면 축소 |
| 타인 노트 코멘트 | 허용 | 허용 | FR-COMMENT-001 |
| 즐겨찾기 추가/삭제 | 워크스페이스 공유 | 워크스페이스 공유 | FR-FAV-001/002 |
| 초대 발급/취소(ENT-WS-003) | 허용 | 거부 | 워크스페이스 관리 권한 owner 한정 |
| 멤버 제거 | 허용 | 본인 탈퇴만 | 정원 2인 관리 |
| 워크스페이스 삭제 | 허용 | 거부 | 데이터 수명주기 소유 |
| 동의 철회/계정·데이터 삭제 요청 | 본인 | 본인 | PIPA 정보주체 권리(FR-SET-002) |

- owner/partner는 데이터 read/write 권한이 대칭이고(대등한 부부 사용), 차이는 워크스페이스 관리(초대·멤버·삭제)에 한정한다.
- write는 RLS(행 수준) + 트랜잭션 RPC(다단계 write, 예: 초대 수락 시 workspace_member 생성)에서 이중 검증한다.

## 4. Secret Handling

| Secret | 저장 위치 | 접근 주체 | 회전 정책 | 감사 |
| --- | --- | --- | --- | --- |
| 국토부 OpenAPI 서비스키 | Supabase Edge Function secret (env) | Edge Functions(TB-06)만 | 분기 1회 또는 유출 의심 시 즉시 | 사용 호출 로그(JOB-DATA-001/002 메타) |
| Kakao REST 키(지오코딩) | Edge Function secret | Edge Functions만 | 분기 1회 | 프록시 호출 로그 |
| Kakao Map JS/네이티브 SDK 키 | 앱 번들(불가피 노출) | 클라이언트 | 도메인/패키지 제한, 유출 시 회전 | Kakao 콘솔 사용량 |
| Supabase service_role 키 | Edge Function secret / CI secret | Edge Functions, 배포 파이프라인 | 분기 1회, 인력 변동 시 즉시 | 배포 로그 |
| Supabase anon key | 앱 번들(공개 전제) | 클라이언트 | RLS로 보호, 회전은 영향 평가 후 | - |
| Expo Push 자격/토큰 서명 | Edge Function secret | JOB-NOTIFY-001 | 연 1회 | 발송 로그 |
| DB 접속 자격 | Supabase 관리형(노출 없음) | Supabase 내부 | 관리형 | - |

원칙: 앱 번들에는 anon key와 Kakao SDK 키만 포함되며, 그 외 모든 외부/특권 키는 Edge Function secret에만 존재한다(TB-06). 시크릿은 dev/prod 프로젝트별로 분리(인프라 문서 §2). 로그·에러 리포트·클라이언트 응답에 시크릿/토큰을 출력 금지(마스킹).

## 5. 데이터 분류

| 분류 | 데이터 | 엔티티 | 처리 원칙 |
| --- | --- | --- | --- |
| 민감(sensitive) | 임장 단지 위치 좌표, EXIF 위치, 노트 사진 | ENT-NOTE-001(좌표), ENT-MEDIA-001 | 동의 기반 수집, 최소 수집, 서명 URL, EXIF 위치 분리/제거(ADR-006) |
| 개인(personal) | 이메일, 표시 이름, 디바이스 토큰 | ENT-USR-001, ENT-DEV-001 | 인증·알림 목적 한정, 삭제 시 함께 폐기 |
| 워크스페이스(공유) | 노트 본문/체크리스트, 코멘트, 즐겨찾기 | ENT-NOTE-001/002, ENT-CMT-001, ENT-FAV-001 | 멤버 2인 공유, RLS 격리 |
| 공공/캐시 | 단지 메타, 실거래가 | ENT-CMP-001, ENT-TX-001 | 비민감 공개데이터, 캐시·신선도 메타 노출 |
| 운영 | 감사 로그, 동의 이력 | (감사/동의 테이블) | 무결성 보존, 보존기간 후 정리 |

위치·사진은 민감정보로 분류하며(NFR-003), 수집 전 동의를 전제로 한다(§7). EXIF 내 GPS는 업로드 시 분리하여 노트 좌표와 별도 동의 범위로 다룬다(ADR-006 확정 전 기본은 EXIF 위치 제거).

## 6. 감사 모델

모든 중요 write action은 감사 로그를 남긴다: `actor`(auth.uid), `workspace_id`, `resource`(엔티티+id), `action`(create/update/delete/invite/consent/erase), `decision`(allow/deny), `result`(success/error), `request_id`, `timestamp`.

- 대상 이벤트: 노트 생성/수정/삭제(EVT-NOTE-001/002), 코멘트(EVT-CMT-001), 워크스페이스 초대/수락/멤버 변경(EVT-WS-001), 동의 변경·철회, 계정/데이터 삭제 요청·실행.
- 보관: 감사 로그는 워크스페이스 데이터와 분리된 append-only 테이블에 저장하며 RLS read는 본인 워크스페이스로 제한, write는 RPC/트리거에서만.
- 거부 감사: RLS/정책에 의한 deny도 가능한 범위에서 기록해 오남용 탐지에 활용(NFR-006 알림 연계).

## 7. 개인정보(PIPA) 동의·철회·삭제 흐름

FR-SET-002, NFR-003에 따라 정보주체 권리를 구현한다. 동의 범위 세부는 ADR-006에서 확정한다(현재 open).

### 7.1 동의 수집

- 위치 권한과 사진 접근은 OS 권한과 별개로 앱 내 명시 동의를 수집하고 동의 상태/버전/시각을 저장한다.
- 최소 수집: 임장 목적에 필요한 좌표·사진만 수집. EXIF 위치는 기본 분리.
- 동의 단위: (a) 위치 수집, (b) 사진 수집·저장, (c) 알림 발송(device_token). 각 단위 개별 동의·철회 가능.

### 7.2 철회

- 사용자가 D-설정(FR-SET-002)에서 동의 단위를 철회하면 해당 신규 수집을 즉시 중단한다.
- 알림 동의 철회 시 device_token(ENT-DEV-001) 비활성화 및 JOB-NOTIFY-001 발송 제외.
- 위치/사진 동의 철회는 신규 수집 중단이며, 기존 데이터 삭제는 별도 삭제 요청으로 처리(아래).

### 7.3 삭제 (정보주체 삭제권 / 계정 삭제)

- 삭제 요청 시 2단계: 즉시 소프트 삭제(접근 차단) → 유예기간 후 하드 삭제(영구 폐기) 예약 Job 실행.
- 삭제 범위: 본인 작성 노트/사진/코멘트, 본인 user_profile, device_token. 워크스페이스 공유 데이터의 처리는 잔존 멤버 영향 고려(ADR-006에서 워크스페이스 단독 소유 시 전체 폐기 여부 확정).
- Storage 사진은 원본+썸네일 객체를 함께 삭제하고 서명 URL을 무효화한다.
- 삭제 실행·완료는 감사 로그에 기록(§6).

### 7.4 흐름 요약

```text
동의수집(앱) → consent 상태 저장(Postgres) → 수집 허용
철회(앱) → consent off → 신규 수집 중단 + 알림 제외
삭제요청(앱) → soft delete(접근차단) → [유예] → 삭제 Job(하드 삭제 + Storage 폐기 + URL 무효화) → 감사
```

## 8. Storage 서명 URL 정책

- 사진 버킷은 비공개(public 비활성). 모든 read/write는 단기 서명 URL로만 수행한다(NFR-002, FR-MEDIA-001/002).
- 업로드: 클라이언트는 RLS/정책 검증 후 발급된 서명 업로드 URL로만 업로드. 경로는 `workspace_id/note_id/...`로 워크스페이스 격리.
- 다운로드: 노트 read 권한을 가진 멤버에게만 단기(예: 분 단위) 서명 read URL 발급. URL은 클라이언트 측 캐시 외 영속 저장 금지.
- 썸네일: JOB-MEDIA-001이 생성한 썸네일도 동일 비공개 버킷·서명 URL 정책 적용.
- 만료/회전: 서명 URL은 짧은 TTL, 삭제 시 객체 폐기로 URL 자동 무효.

## 9. Threat / Abuse Cases

| Threat ID | 시나리오 | STRIDE | 영향 | 완화 |
| --- | --- | --- | --- | --- |
| THR-001 | RLS 정책 오류로 타 워크스페이스 노트/사진 열람 | Information Disclosure | 개인정보 유출 | 기본 거부, 정책 단위 테스트, 서버 멤버십 재검증, 교차접근 e2e | 
| THR-002 | 앱에서 외부 키 추출 후 국토부/Kakao 직접 호출·쿼터 소진 | Tampering/DoS | 비용·서비스 저하 | 외부 키 앱 비포함, Edge Function 프록시(TB-06), 키 도메인 제한, 사용량 알림 |
| THR-003 | 탈취된 JWT로 워크스페이스 데이터 접근 | Spoofing | 무단 접근 | 짧은 access 만료, refresh 보안 저장, 로그아웃 세션 폐기, 이상 탐지 |
| THR-004 | 서명 URL 유출/공유로 사진 무단 다운로드 | Information Disclosure | 사진 노출 | 단기 TTL, 비공개 버킷, 권한자에게만 발급, 삭제 시 무효화 |
| THR-005 | 동의 없이 위치/EXIF 수집 또는 철회 미반영 | Privacy 위반 | PIPA 위반 | 동의 게이트, EXIF 위치 분리, 철회 즉시 반영, 감사 |
| THR-006 | 악의적 입력으로 RPC/Edge Function 주입·과대 요청 | Tampering/DoS | 데이터 손상·과부하 | 입력 검증, 파라미터 바인딩, 요청 크기·레이트 제한 |
| THR-007 | 멤버가 정원(2인) 초과 초대 또는 권한 상승 시도 | Elevation of Privilege | 격리 약화 | owner 한정 초대(ENT-WS-003), 정원 검증 RPC, partner 관리권한 차단 |
| THR-008 | 삭제 요청 후 하드 삭제 누락(잔존 데이터) | Repudiation/Privacy | 삭제권 미이행 | 삭제 Job 멱등·재시도, 완료 감사, 미완료 알림 |
| THR-009 | 로그/크래시 리포트에 위치·토큰·키 유출 | Information Disclosure | 민감정보 노출 | 로그 마스킹, 민감필드 제외, PII 스크러빙 |
| THR-010 | 초대 링크/토큰 탈취로 워크스페이스 무단 합류 | Spoofing | 무단 접근 | 초대 토큰 단기 만료·1회용, owner 발급, 수락 시 정원·만료 검증 |

오남용(abuse) 대응: 외부 API 실패율·사용량 급증, 교차 워크스페이스 접근 시도, 삭제 미완료는 관측성 알림(NFR-006, 관측 문서 §4)과 연계해 탐지한다.

## 10. 요구사항 추적

- 인증: FR-AUTH-001/003/004
- 인가/격리: FR-WS-004, NFR-002, ENT-WS-002
- 시크릿: NFR-002, FR-DATA-003
- 개인정보: FR-SET-002, NFR-003, ADR-006
- 미디어/서명 URL: FR-MEDIA-001/002
- 감사/관측 연계: NFR-006
