# 임장노트 (ImJang Note)

부부가 함께 부동산 임장(현장 방문) 기록을 **지도 기반**으로 작성·공유·비교하는 모바일 앱.
지도에서 단지를 누르면 임장 후기를 구조화해 기록하고, 배우자와 실시간으로 공유하며,
국토교통부 실거래가를 옆에 붙여 객관적 시세와 함께 본다.

## 한눈에 보기

| 영역 | 선택 |
| --- | --- |
| 클라이언트 | React Native + Expo (Android 우선), expo-router, React Query, Zustand |
| 지도 | Kakao Map (WebView + JS SDK v3, 클러스터링) — ADR-003 |
| 외부 데이터 | 국토교통부 OpenAPI (단지정보·실거래가) — Edge Function 프록시·캐시, ADR-004 |
| 백엔드 | Supabase (Postgres + Auth + RLS + Realtime + Storage + Edge Functions) — ADR-002 |
| 공유 | 부부 2인 워크스페이스, RLS 격리, Realtime 실시간 동기화 |

## 저장소 구조

```
.
├─ docs/                  제품 계획 문서 (SRS/PRD가 최상위 진실)
│  ├─ 00_governance/      문서 규칙·우선순위·워크플로
│  ├─ 10_requirements/    feature / prd / srs_final / 추적 매트릭스
│  ├─ 20_derived_ui_specs/ IA·와이어프레임·상태·컴포넌트·QA·에이전트 브리프
│  ├─ 30_technical_architecture/ 시스템·FE·BE·API·데이터·비동기·보안·인프라·관측·ADR
│  └─ 40_delivery/        구현 로드맵(REL-001~006)·릴리스 검증
├─ apps/mobile/           Expo 앱 (자세한 실행법은 apps/mobile/README.md)
├─ supabase/              마이그레이션 + Edge Functions + config
│  ├─ migrations/         0001~0008 (스키마·RLS·RPC·Storage·Realtime)
│  └─ functions/          Deno Edge Functions (국토부 프록시·미디어·검색·알림)
└─ AGENTS.md / CLAUDE.md  에이전트 작업 규칙
```

문서는 구현보다 우선한다. 충돌 시 `docs/10_requirements/srs_final.md` → `prd.md` → … 순서를 따른다(`docs/README.md`).

## 빠른 시작

사전 준비: Node 20+, npm, [Supabase CLI](https://supabase.com/docs/guides/cli), Expo(`npx expo`). 지도/실거래가는 Kakao·국토부 키 필요(없어도 앱은 저하 모드로 동작).

### 1) 백엔드 (Supabase)

```bash
# 저장소 루트에서
supabase start                 # 로컬 Postgres/Studio/Edge 런타임 기동
supabase db reset              # migrations/0001~0008 적용
supabase status                # API URL / anon key 출력 → 앱 .env 에 사용

# (선택) 외부 키가 있으면 Edge Function 시크릿 등록
supabase secrets set MOLIT_SERVICE_KEY=...    # 국토부 서비스키 (ADR-004)
# 검색·알림·미디어 등 함수 배포
supabase functions deploy complex_detail transactions refresh_complex_data \
  media_upload_url thumbnail_worker search notify_worker
```

### 2) 앱 (Expo)

```bash
cd apps/mobile
npm install
cp .env.example .env            # SUPABASE URL/ANON_KEY, KAKAO_JS_KEY 채우기
npm run start                   # Android: npm run android
npm run typecheck               # tsc --noEmit
```

전체 로컬 e2e 절차(가입→워크스페이스→지도→노트→코멘트→비교)는 [`RUNNING.md`](RUNNING.md)에 단계별로 정리되어 있다. 화면·구조·env는 [`apps/mobile/README.md`](apps/mobile/README.md), 함수는 [`supabase/functions/README.md`](supabase/functions/README.md) 참조.

## 구현 현황 (REL-001~006 골격)

| 슬라이스 | 범위 | 핵심 |
| --- | --- | --- |
| REL-001 | 인증·워크스페이스 | 로그인/가입, 부부 초대·수락, RLS 격리 |
| REL-002 | 지도·단지 데이터 | Kakao 지도·마커, 국토부 단지/실거래가 프록시·캐시 |
| REL-003 | 노트·사진 | 별점·체크리스트(6항목)·사진(서명 URL·EXIF 제거)·메모 |
| REL-004 | 공유·실시간 | Realtime 동기화, 노트 코멘트 |
| REL-005 | 검색·비교·알림 | 즐겨찾기·비교표, 검색·필터, 알림(Expo Push) |
| REL-006 | 오프라인·관측 | outbox 동기화 큐, 동기화 배지, SLO 텔레메트리 |

> 현재는 **실행 가능한 골격**이다. 각 화면·RPC·Edge Function은 계약(`docs/30_technical_architecture/*`)과 1:1로 매핑되며, 운영 전 강화 항목은 `docs/40_delivery/imjang_note_release_validation_plan.md`의 게이트를 따른다.

## 검증

```bash
# 문서 정합성 (요구사항·화면·ID 추적)
python3 .claude/skills/build-srs-prd-env/scripts/validate_srs_prd_env.py --root .

# 앱 타입체크
cd apps/mobile && npm run typecheck
```

## 보안·개인정보 원칙

- 외부 API 키(국토부 서비스키 등)는 **클라이언트에 두지 않는다** — Edge Function 시크릿에만 보관(NFR-002, ADR-003/004).
- 데이터 접근은 워크스페이스 단위 **RLS 기본 거부**로 격리한다.
- 위치·사진은 목적별 **개별 동의** 후 수집, 사진 EXIF GPS는 업로드 시 제거(ADR-006, PIPA).
