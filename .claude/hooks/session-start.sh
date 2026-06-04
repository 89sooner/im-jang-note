#!/usr/bin/env bash
# Session-start hook: 컨테이너 세션 시작 시 apps/mobile 의존성을 준비한다.
# Claude Code on the web 환경은 ephemeral 이므로 매 세션마다 node_modules 복원이 필요하다.
# 실패해도 세션은 계속 진행 — 메시지만 출력한다.

set -u

cd "$(dirname "$0")/../.." || exit 0

if [ -d "apps/mobile" ]; then
  pushd apps/mobile >/dev/null || exit 0
  if [ ! -d "node_modules" ]; then
    echo "[session-start] installing apps/mobile deps..."
    npm ci --no-audit --no-fund 2>&1 | tail -3 || echo "[session-start] npm ci failed (skip)"
  else
    echo "[session-start] apps/mobile node_modules present"
  fi
  popd >/dev/null || true
fi

echo "[session-start] ready"
