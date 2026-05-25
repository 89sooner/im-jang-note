# build-srs-prd-env 사용 가이드

이 스킬은 새 제품 아이디어를 SRS/PRD, 화면 명세, 기술 아키텍처, 구현 로드맵, 릴리스 검증 계획까지 이어지는 제품 계획 저장소로 만드는 도구다.

## 1. 새 제품 계획 저장소 만들기

```bash
mkdir -p ~/my-product
cd ~/my-product

python3 ~/.codex/skills/build-srs-prd-env/scripts/scaffold_srs_prd_env.py \
  --root . \
  --product-name "My Product" \
  --slug my_product \
  --agent-files both
```

`--product-name`은 사람이 읽는 제품명이고, `--slug`는 파일 prefix다. 예를 들어 `--slug internal_crm`이면 `internal_crm_system_architecture.md` 같은 문서가 생성된다.

## 2. Codex 또는 Claude Code에 시작 지시하기

```text
Use $build-srs-prd-env.

이 저장소는 <제품명> 제품 계획 환경이다.
docs/README.md와 docs/00_governance 문서를 먼저 읽고,
내 제품 아이디어를 바탕으로 feature.md, prd.md, srs_final.md부터 채워라.
모르는 내용은 임의로 확정하지 말고 assumptions 또는 open decisions로 남겨라.
```

## 3. 권장 작성 순서

1. `docs/10_requirements/feature.md`
2. `docs/10_requirements/prd.md`
3. `docs/10_requirements/srs_final.md`
4. `docs/10_requirements/requirements_screen_traceability_matrix.md`
5. `docs/20_derived_ui_specs/*`
6. `docs/30_technical_architecture/*`
7. `docs/40_delivery/*`
8. `*_ai_agent_implementation_request.md`
9. `*_ai_agent_execution_brief.md`

## 4. 검증하기

```bash
python3 ~/.codex/skills/build-srs-prd-env/scripts/validate_srs_prd_env.py --root .
```

초기 scaffold 상태에서는 `결정 필요` 항목이 남아 있는 것이 정상이다. 구현 착수 전에는 validator 오류를 없애고, 주요 open decision을 승인 또는 명시적 보류 상태로 정리한다.

## 5. 기존 파일을 덮어써야 할 때

```bash
python3 ~/.codex/skills/build-srs-prd-env/scripts/scaffold_srs_prd_env.py \
  --root . \
  --product-name "My Product" \
  --slug my_product \
  --agent-files both \
  --force
```

`--force`는 같은 이름의 문서를 덮어쓴다. 이미 사람이 작성한 문서가 있는 저장소에서는 먼저 백업하거나 diff를 확인한다.
