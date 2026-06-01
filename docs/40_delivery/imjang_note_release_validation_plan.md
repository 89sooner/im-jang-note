# 임장노트 릴리스 검증 계획

## 1. 목적과 범위

이 문서는 릴리스 전 기능, 품질, 보안, 성능, 접근성, 마이그레이션, 관측, 운영 준비, 롤백 가능성을 검증하는 전략과 게이트를 정의한다. 검증 대상은 REL-001~REL-006이며 잠긴 ID 사전과 `../30_technical_architecture/*`, `imjang_note_implementation_roadmap.md`에 근거한다. 새 제품 범위를 추가하지 않는다.

## 2. 검증 범위

| 영역 | 검증 방식 | 통과 기준 | 담당 |
| --- | --- | --- | --- |
| Requirements | traceability review | 모든 REL 항목이 FR/NFR/ENT/JOB/EVT와 연결 | Product/QA |
| Unit | 함수/컴포넌트/RPC 단위 테스트 | 핵심 로직 커버, 회귀 0 | FE/BE |
| Integration | 앱↔Supabase↔Edge Fn 통합 | 워크스페이스 read/write 통합 통과 | BE/QA |
| Contract | 국토부/Kakao 프록시·내부 API 계약 테스트 | DTO/에러/버전 계약 일치(FR-DATA-003) | BE/QA |
| E2E | 핵심 흐름(로그인→워크스페이스→지도→노트→공유→검색→알림) | REL별 end-to-end 통과 | QA |
| Accessibility | 44pt 타깃, 스크린리더, 동적 글자, WCAG AA | 핵심 화면 접근성 통과(NFR-005) | FE/QA |
| Security | RLS/authz, 시크릿, 서명 URL, 동의, 위협 케이스 | high risk 미해결 0(NFR-002/003) | Security |
| Performance | 지도 렌더/저장/실거래 지연, 60fps | NFR-001 SLO-01/02/03 충족 | FE/SRE |
| Migration | 마이그레이션 적용/down/PITR | 무손실 롤백 경로, 정책 테스트 통과 | BE/DBA |
| Observability | 대시보드/알림/런북 | 주요 SLO 관측·ALT 동작(NFR-006) | SRE |
| Rollback | OTA/함수/스키마 롤백 리허설 | 트리거→복구 검증(NFR-004) | Infra/SRE |

## 3. Release Gates

- Gate 1: 요구사항/추적성 리뷰 — 모든 REL이 FR/NFR/ENT/JOB/EVT에 연결.
- Gate 2: 아키텍처/ADR 리뷰 — ADR-001~008 accepted 상태 유지(2026-06-01 확정). 신규 결정 발생 시 새 ADR로 등록·승인 후 진입. REL별 의존 ADR 검증: REL-002→ADR-003/004 가드레일(마커 ≤300, 캐시 TTL), REL-003→ADR-006 동의·EXIF, REL-006→ADR-005 idempotency/LWW.
- Gate 3: 구현 테스트 — unit/integration/contract/e2e 통과, 크래시 프리 세션≥99.5%(SLO-08).
- Gate 4: 보안·개인정보 리뷰 — RLS 교차접근 0(THR-001), 시크릿 비노출(THR-002), 서명 URL(THR-004), 동의/철회/삭제(THR-005/008), 로그 마스킹(THR-009).
- Gate 5: 성능·접근성 리뷰 — SLO-01/02/03 충족, WCAG AA 핵심 화면 통과.
- Gate 6: 운영 준비·롤백 리허설 — ALT-01~10 동작, 런북 RB-01~08 확인, 마이그레이션/OTA 롤백 리허설 성공.

## 4. Rollout / Rollback / Monitoring

- rollout strategy: dev(EAS preview/dev Supabase) 검증 → 승인 → prod(EAS production/prod Supabase). 백엔드는 마이그레이션(하위호환) → Edge Fn → 앱 순(인프라 §7). 스토어 배포는 단계적 출시.
- feature flags: open ADR 의존 기능(지도 연동 변형, 충돌 정책, 동의 변형)은 플래그로 점진 노출.
- migration order: 확장 우선 마이그레이션 선배포 → 코드 전환 → 정리(contract). RLS 변경 후 정책 테스트 필수.
- rollback trigger: SLO-04 위반(ALT-05), 마이그레이션 실패(ALT-06), 크래시 급증(ALT-07), 교차 워크스페이스 노출 의심(ALT-08).
- rollback owner: Infra/SRE(스키마/함수), FE(OTA), Security(권한 이상).
- monitoring: 배포 후 SLO-01~08 대시보드·ALT 알림 관찰. 오류 예산 소진 시 배포 동결(REL-006).
- user communication: 저하 모드/점검은 앱 내 배너로 고지. 데이터 영향 변경은 사전 안내.

## 5. REL별 검증 초점

| REL | 핵심 검증 |
| --- | --- |
| REL-001 | RLS 교차접근 0, 초대/수락 e2e, 세션 갱신, owner/partner 권한 |
| REL-002 | 캐시 적중 1.5s/폴백, 마커 60fps, 국토부 계약, 외부 키 비노출 |
| REL-003 | 노트 저장 1s, 서명 URL 권한, 동의 게이트/철회, EXIF 분리 |
| REL-004 | 실시간 반영, 코멘트 동기화, 채널 격리 |
| REL-005 | 검색/비교, 즐겨찾기 공유, 푸시 성공률≥95%, 동의 철회 발송 제외 |
| REL-006 | 오프라인 무손실 재생, SLO/알림/런북, 보안 하드닝, 롤백 리허설 |

## 6. Release Signoff

| Role | Signoff Criteria | Status |
| --- | --- | --- |
| Product | 범위(REL) 수용, open ADR 보류 승인 | pending |
| Engineering | 테스트·아키텍처·마이그레이션 수용 | pending |
| Security | high-risk(THR) 미해결 0, 개인정보 흐름 검증 | pending |
| Operations | 런북(RB)·알림(ALT)·롤백 리허설 준비 | pending |
| QA | 릴리스 체크리스트(Gate 1~6) 통과 | pending |

## 7. 요구사항 추적
- 성능: NFR-001 (SLO-01/02/03)
- 보안/개인정보: NFR-002, NFR-003 (THR-*, 보안 문서)
- 신뢰성/롤백: NFR-004 (SLO-04~08, ALT/RB)
- 접근성: NFR-005
- 관측: NFR-006
- 이식성: NFR-007
