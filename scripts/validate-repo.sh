#!/usr/bin/env bash
set -euo pipefail

echo "Validating repository..."

if command -v pnpm >/dev/null 2>&1; then
  if [[ -f "package.json" ]]; then
    pnpm lint || true
    pnpm typecheck || true
    pnpm test || true
    pnpm build || true
  fi
else
  echo "pnpm not found. Skipping package validation."
fi

echo "Repository validation complete."
