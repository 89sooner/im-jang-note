# 임장노트 디자인 시스템 토큰 문서

## 0. 문서 위치와 책임

이 문서는 화면·컴포넌트(C-001~C-015)가 사용하는 시맨틱 토큰을 정의한다. 야외·이동 중·한 손 조작·고/저조도 환경과 WCAG AA 대비(NFR-005)를 전제로 한다. 토큰은 의미 기반이며 임의 시각 결정을 금지한다. 색만으로 상태·권한을 전달하지 않는다.

## 1. 디자인 원칙

- 도메인(부동산 임장)에 맞는 정보 밀도: 단지·노트·비교에서 충분한 가독성.
- 시맨틱 토큰 우선: primitive → semantic → component 3계층.
- 상태·권한은 색 + 아이콘 + 텍스트로 다중 전달(NFR-005).
- 야외 가독성: 본문 대비 4.5:1, 큰 텍스트/아이콘 3:1 이상(WCAG AA).
- 한 손 조작: 주요 액션은 하단 엄지 도달 영역, 터치 타깃 최소 44pt.

## 2. 토큰 계층

- Primitive token: raw scale(색/숫자), 직접 사용 금지.
- Semantic token: 제품 의미(surface/text/status/interaction 등).
- Component token: C-* 별 적용값(semantic 참조).

## 3. Color Tokens (Semantic)

명도 대비는 라이트/다크 모두 AA를 만족하도록 매핑한다.

| Token | 목적 |
| --- | --- |
| `surface.base` | 기본 배경 |
| `surface.raised` | 시트/카드/오버레이(C-003 미리보기, C-009) |
| `surface.map.overlay` | 지도 위 오버레이(C-010/C-013, 지도 대비 확보) |
| `text.primary` | 주요 텍스트 |
| `text.secondary` | 보조 텍스트 |
| `text.muted` | 비활성/메타 |
| `text.onAccent` | accent 위 텍스트 |
| `border.default` | 기본 경계 |
| `border.strong` | 강조 경계/포커스 보조 |
| `accent.primary` | 주요 액션(노트 작성 등 핵심 CTA) |
| `accent.muted` | 보조 강조 |
| `status.success` | 성공/동기화 완료(C-013) |
| `status.warning` | 경고/저하 모드(FR-DATA-003) |
| `status.danger` | 위험/오류/파괴적 액션 |
| `status.info` | 정보/오프라인 안내 |
| `status.pending` | 동기화중/대기(C-013 operation_pending) |
| `rating.active` | 별점 채움(C-004, 아이콘 형태 병행) |
| `favorite.active` | 즐겨찾기 활성(C-003, FR-FAV-001) |
| `price.up` / `price.down` / `price.flat` | 실거래가 등락(C-014, 값·방향 텍스트 병기) |

규칙: status·price·rating은 반드시 아이콘/텍스트와 함께 사용한다.

## 4. Typography Tokens

| Token | 용도 |
| --- | --- |
| `type.display` | 화면 타이틀(드물게) |
| `type.heading` | 섹션 제목(D-003 단지명 등) |
| `type.body` | 본문(노트 메모 FR-NOTE-004) |
| `type.label` | 폼 라벨·체크리스트 항목(C-005) |
| `type.caption` | 메타·시간·보조 |
| `type.mono` | 가격/수치(C-014/C-011 정렬) |

- 최소 본문 크기는 야외 가독성을 고려해 충분히 크게 설정. 동적 글꼴 크기(OS 설정) 지원(NFR-005).

## 5. Spacing / Density / Radius / Elevation

### Spacing

- `space.0~space.7` 4pt 베이스 스케일.
- 한 손 조작: 하단 액션 바·시트 핸들 영역에 충분한 여백.

### Density

- comfortable(기본, 야외 가독성): 단지/노트/피드.
- compact: C-011 CompareTable 등 정보 밀도 높은 표.

### Radius

- `radius.sm`(칩/배지 C-013/C-002), `radius.md`(카드 C-003), `radius.lg`(시트 C-009), `radius.full`(아바타 C-015).

### Elevation

- `elevation.0` 평면, `elevation.1` 카드, `elevation.2` 시트/팝오버, `elevation.3` 지도 위 오버레이.
- elevation은 그림자 + 표면색 차이로 동시 표현(저조도 대비).

## 6. Interaction States (focus / selected / disabled / motion)

| 상태 | 토큰 | 규칙 |
| --- | --- | --- |
| focus | `state.focus.ring` | 가시적 포커스 링(border.strong 기반), 색 외 윤곽 동반 |
| selected | `state.selected.bg` / `state.selected.fg` | 선택 마커(C-002)·탭·필터, 색+형태 동시 |
| pressed | `state.pressed` | 터치 피드백 |
| disabled | `state.disabled.fg` / `state.disabled.bg` | 비활성 사유 표시(정책/권한), 대비 유지 |
| loading | `state.loading` | skeleton/progress, 레이아웃 시프트 방지 |

### Motion Tokens

- `motion.duration.fast`(상태 피드백), `motion.duration.base`(전환), `motion.duration.slow`(시트).
- `motion.easing.standard` / `motion.easing.emphasized`.
- 사용자 "동작 줄이기" OS 설정 시 모션 최소화(NFR-005).

## 7. 토큰 사용 규칙

- 컴포넌트는 component token → semantic token만 참조. primitive 직접 사용 금지.
- 새 색/간격을 화면별로 즉흥 정의하지 않는다(시맨틱 토큰 추가로만 확장).
- 상태 색(status.*, price.*, rating.*)은 항상 비색 단서(아이콘/텍스트/형태) 동반.
- 모든 인터랙티브 요소는 focus·disabled 토큰을 구현한다(NFR-005).
