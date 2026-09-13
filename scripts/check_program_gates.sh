#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$repo_root"

pnpm check:ux:sheets
pnpm check:ux:coverage
pnpm check:ux:tokens
pnpm test:ux-gates
pnpm check:source-quality

echo "MAXION program gates: pass"
