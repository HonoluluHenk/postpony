#!/bin/bash
set -euo pipefail

# Script to generate SSL certificates for local development

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

CERT_DIR="${PROJECT_ROOT}/developer-local-settings/conf/certs"
APP_HOSTNAME="${1:-game-scheduler.localhost}"

mkdir -p "$CERT_DIR"

mkcert \
  -cert-file "$CERT_DIR/$APP_HOSTNAME.pem" \
  -key-file "$CERT_DIR/$APP_HOSTNAME.key" \
  "$APP_HOSTNAME"

echo "Certificates generated in $CERT_DIR"
