<!-- Generated: 2026-05-29, updated: 2026-06-02 -->

# 임장노트

## Purpose

Product planning **and implementation** repository for 임장노트. `docs/`는 SRS/PRD·아키텍처·딜리버리 등 승인된 제품 진실을 담고, `apps/mobile/`(Expo)와 `supabase/`(마이그레이션·Edge Functions)는 그 계약을 구현한 코드다. 문서는 항상 코드보다 우선한다.

## Key Files

| File | Description |
| --- | --- |
| `README.md` | 프로젝트 개요·실행 가이드·구현 현황 |
| `docs/README.md` | 문서 마스터 인덱스, 읽기 순서, 우선순위, 갱신 cascade |
| `docs/10_requirements/srs_final.md` | 최종 구현 기준이자 최상위 제품 진실 |
| `docs/30_technical_architecture/imjang_note_api_contracts.md` | API/RPC/Edge Function 계약 (코드와 1:1) |
| `docs/40_delivery/imjang_note_implementation_roadmap.md` | REL-001~006 슬라이스 |
| `apps/mobile/README.md` | Expo 앱 실행·구조 |
| `supabase/functions/README.md` | Edge Functions 목록·env·배포 |

## Subdirectories

| Directory | Purpose |
| --- | --- |
| `docs/00_governance/` | 문서 역할·우선순위·워크플로 |
| `docs/10_requirements/` | feature, PRD, workflow, SRS, traceability |
| `docs/20_derived_ui_specs/` | IA·와이어프레임·플로우·상태·컴포넌트·토큰·QA·에이전트 브리프 |
| `docs/30_technical_architecture/` | 시스템·FE·BE·API·데이터·비동기·보안·인프라·관측·ADR |
| `docs/40_delivery/` | 구현 로드맵·릴리스 검증 |
| `apps/mobile/` | React Native + Expo 클라이언트 |
| `supabase/migrations/` | Postgres 스키마·RLS·RPC·Storage·Realtime |
| `supabase/functions/` | Deno Edge Functions (국토부 프록시·미디어·검색·알림) |

## For AI Agents

- 제품 범위를 바꾸기 전 `docs/10_requirements/srs_final.md`를 먼저 본다. 새 요구사항을 발명하지 않는다.
- 충돌 우선순위: `srs_final.md` > `prd.md` > `workflow.md` > `feature.md` > 추적 매트릭스 > 파생 UI > 기술 아키텍처 > 딜리버리 > 에이전트 브리프.
- **코드는 문서 계약을 따른다.** 화면 ID(D-*), 요구사항 ID(FR-*/NFR-*), 엔티티(ENT-*), API(API-*), 잡/이벤트(JOB-*/EVT-*), 컴포넌트(C-*)는 잠긴 값만 사용하고 임의로 신설하지 않는다.
- 새 기능은 SRS에 먼저 반영한 뒤 코드화한다. 구현 편의로 범위를 조용히 확장하지 않는다.
- 외부 API 키는 클라이언트에 두지 않는다(Edge Function 시크릿). 데이터 접근은 RLS를 통한다.
- IDs는 안정적으로 유지하고, 폐기는 삭제가 아니라 상태 표기로 한다.

## Testing / Verification

```bash
# 문서 정합성 (요구사항·화면·기술 ID 추적)
python3 .claude/skills/build-srs-prd-env/scripts/validate_srs_prd_env.py --root .
rg "FR-[A-Z0-9]+-[0-9]+" docs/
rg "\b(API|ENT|JOB|EVT)-[A-Z0-9]+-[0-9]{3}|\bREL-[0-9]{3}" docs/

# 앱 타입체크
cd apps/mobile && npm run typecheck

# 백엔드 (로컬)
supabase db reset    # migrations 0001~0008 적용
```

## Dependencies

- Node 20+, npm, Supabase CLI, Expo. 지도/실거래가는 Kakao JS 키·국토부 서비스키 필요(없으면 저하 모드).

