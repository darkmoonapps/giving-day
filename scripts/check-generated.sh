#!/usr/bin/env bash
set -euo pipefail

pnpm codegen

if [ -n "$(git status --porcelain -- apps/api/openapi.json apps/web/src/api/generated)" ]; then
  echo "Generated OpenAPI client is out of date. Run pnpm codegen and commit the result."
  git status --porcelain -- apps/api/openapi.json apps/web/src/api/generated
  git diff -- apps/api/openapi.json apps/web/src/api/generated
  exit 1
fi
