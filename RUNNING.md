# 로컬 실행 가이드 (End-to-End)

임장노트를 로컬에서 처음부터 띄우고, 핵심 흐름(REL-001~005)을 손으로 검증하는 절차다.
`README.md`의 빠른 시작을 더 자세히 풀어 쓴 버전이다.

## 0. 사전 준비

| 도구 | 버전/설치 |
| --- | --- |
| Node | 20+ (`node -v`) |
| npm | 10+ |
| Supabase CLI | `npm i -g supabase` 또는 brew/scoop |
| Docker | Supabase 로컬 스택용 (실행 중이어야 함) |
| Expo | `npx expo` (별도 설치 불필요) |

선택(없어도 저하 모드로 동작):
- Kakao JavaScript 키 — 지도 렌더 (https://developers.kakao.com)
- 국토교통부 OpenAPI 서비스키 — 단지/실거래가 (https://www.data.go.kr)

## 1. 백엔드 기동

```bash
# 저장소 루트
supabase start            # Postgres/Studio/Auth/Realtime/Edge 로컬 컨테이너
supabase db reset         # migrations/0001~0008 일괄 적용 (+ seed.sql)
supabase status           # API URL, anon key, service_role key 출력
```

`supabase status` 출력에서 다음을 메모:
- `API URL` (예: `http://127.0.0.1:54321`)
- `anon key`

### (선택) 외부 키 등록 + 함수 서빙

```bash
# 국토부 실거래가/단지정보를 실제로 받으려면
supabase secrets set MOLIT_SERVICE_KEY=<발급키>
supabase functions serve            # 전체 Edge Function 로컬 서빙
```

키가 없으면 `complex_detail`/`transactions`는 캐시/빈 결과 + "최신 아님" 저하 모드로 응답한다(NFR-004) — 앱은 정상 동작한다.

## 2. 앱 기동

```bash
cd apps/mobile
npm install
cp .env.example .env
```

`.env` 편집:

```
EXPO_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
EXPO_PUBLIC_SUPABASE_ANON_KEY=<supabase status 의 anon key>
EXPO_PUBLIC_KAKAO_JS_KEY=<Kakao JS 키 또는 비움>
```

```bash
npm run typecheck         # 사전 점검
npm run start             # Expo Dev Server (a → Android 에뮬레이터/기기)
```

> 에뮬레이터에서 `127.0.0.1`은 호스트가 아닐 수 있다. Android 에뮬레이터는 `http://10.0.2.2:54321`,
> 실기기는 PC의 LAN IP(`http://192.168.x.x:54321`)를 사용한다.

## 3. 손으로 검증하는 핵심 흐름

### REL-001 — 인증 + 부부 워크스페이스
1. 앱 첫 화면(D-001)에서 이메일/비밀번호로 **가입** → 자동 로그인.
2. 설정 탭(D-011) → "워크스페이스 관리/초대" → **워크스페이스 생성**.
3. "초대 코드 발급" → 코드 복사.
4. 다른 계정(시크릿/다른 기기)으로 가입 → 워크스페이스 화면에서 **코드로 수락** → 멤버 2/2 확인.
   - 검증 포인트: 상대 계정으로 로그인 시 같은 워크스페이스 데이터가 보이고, 제3 계정은 보이지 않음(RLS 격리).

### REL-002 — 지도 + 단지 데이터
5. 지도 탭(D-002). 키가 있으면 Kakao 지도 렌더. 단지 데이터가 없으면 비어 있음(정상).
6. 단지 마커 탭 → 단지 상세(D-003)에서 국토부 정보·실거래가·신선도 배지 확인.
   - 단지가 없을 때: 검색(D-007)이나 추후 단지 생성으로 채운다.

### REL-003 — 노트 작성
7. 단지 상세에서 **임장 노트 작성**(D-004) → 별점·체크리스트(6항목)·사진·메모 입력 → 저장.
8. 피드 탭(D-005)에서 방금 노트 확인, 노트 상세(D-012)에서 내용·사진 확인.

### REL-004 — 실시간 코멘트
9. 노트 상세에서 **코멘트** 작성 → 배우자 계정 화면에서 새로고침 없이 실시간 반영(FR-WS-003).

### REL-005 — 즐겨찾기·비교·검색·알림
10. 단지 상세에서 **즐겨찾기** → 즐겨찾기 탭(D-008)에 표시. 2곳 이상이면 **비교**(D-006).
11. 지도의 검색 바 → 검색(D-007)에서 단지명/필터로 조회.
12. 알림 탭(D-010): 배우자가 노트/코멘트를 만들면 알림 생성(트리거). 푸시는 `notify_worker` 실행 시 발송.

## 4. 검증 명령

```bash
# 앱 타입체크
cd apps/mobile && npm run typecheck

# 문서/ID 정합성
python3 .claude/skills/build-srs-prd-env/scripts/validate_srs_prd_env.py --root .

# DB 재적용(스키마 변경 후)
supabase db reset
```

## 5. 자주 막히는 곳

| 증상 | 원인/해결 |
| --- | --- |
| 지도에 "지도 키가 필요합니다" | `EXPO_PUBLIC_KAKAO_JS_KEY` 비어 있음. 키 입력 후 재시작. |
| 로그인 후 빈 화면/네트워크 오류 | `.env`의 SUPABASE URL이 에뮬레이터에서 접근 불가. `10.0.2.2`/LAN IP 사용. |
| 실거래가가 항상 "최신 아님" | `MOLIT_SERVICE_KEY` 미설정 또는 함수 미서빙. 저하 모드(정상). |
| 초대 수락 시 정원 초과 | 워크스페이스 정원 2인. 기존 멤버 제거 후 재시도. |
| 알림이 안 옴(푸시) | in-app 알림은 트리거로 생성됨. 실제 푸시는 `notify_worker` 호출 필요(`x-cron-secret`). |
