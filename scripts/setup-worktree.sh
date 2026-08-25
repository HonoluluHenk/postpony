#!/bin/bash
set -euo pipefail

# Configure PostPony in a git worktree for parallel development: write a
# per-worktree .env (ports + SQLite path derived from the branch), copy the
# local-settings template, generate TLS certs, install deps, migrate the DB.
# Usage: ./scripts/setup-worktree.sh [--quick]

QUICK=false
if [[ "${1:-}" == "--quick" ]]; then
  QUICK=true
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
cd "${PROJECT_ROOT}"

APP_HOSTNAME="${APP_HOSTNAME:-game-scheduler.localhost}"

# Ref (branch, or short commit if detached) drives ports + DB filename.
REF="$(git rev-parse --abbrev-ref HEAD 2>/dev/null || git rev-parse --short HEAD)"
SAFE_REF="$(printf '%s' "${REF}" | tr -c '[:alnum:]' '-')"

HASH="$(printf '%s' "${REF}" | cksum | cut -d' ' -f1)"
OFFSET=$((10#${HASH} % 100))
APP_PORT=$((3000 + OFFSET))
E2E_APP_PORT=$((3100 + OFFSET))

if [[ "${QUICK}" == "true" ]]; then
  TLS_ENABLED=false
  APP_HOSTNAME=localhost
else
  TLS_ENABLED=true
  if ! grep -qE "^[^#]*\b${APP_HOSTNAME}\b" /etc/hosts; then
    echo "error: ${APP_HOSTNAME} not in /etc/hosts; add '127.0.0.1 ${APP_HOSTNAME}' (sudo) and re-run" >&2
    exit 1
  fi
fi

# Local settings dir (git-ignored, per worktree). Merge the committed template
# so unrelated personal files in an existing dir survive a re-run.
if [[ ! -d developer-local-settings-template ]]; then
  echo "error: developer-local-settings-template/ not found; run from a worktree root" >&2
  exit 1
fi
mkdir -p developer-local-settings
cp -r developer-local-settings-template/. developer-local-settings/

cat > .env <<EOF
APP_HOSTNAME=${APP_HOSTNAME}
APP_DB_URL=file:./developer-local-settings/data/postpony-${SAFE_REF}.db
APP_DB_AUTH_TOKEN=unused-for-file-urls
# Set to false to serve plain HTTP behind Cloudflare edge TLS / a reverse proxy.
APP_TLS_ENABLED=${TLS_ENABLED}
# Dev server port for this worktree (derived from the branch, parallel-safe).
APP_PORT=${APP_PORT}
# E2E server port. Playwright loads .env itself (see playwright.config.ts), so
# `npm run e2e` picks this up automatically; an exported shell value wins.
E2E_APP_PORT=${E2E_APP_PORT}
EOF

if [[ "${QUICK}" == "false" ]]; then
  "${SCRIPT_DIR}/create-certs.sh" "${APP_HOSTNAME}"
fi

npm install
npm run db:migrate

echo
echo "Worktree configured for '${REF}'."
echo "  app:  $([ "${QUICK}" == "true" ] && echo "http://localhost:${APP_PORT}" || echo "https://${APP_HOSTNAME}:${APP_PORT}")"
echo "  db:   developer-local-settings/data/postpony-${SAFE_REF}.db"
echo "  e2e:  E2E_APP_PORT=${E2E_APP_PORT}   (picked up automatically by 'npm run e2e')"
