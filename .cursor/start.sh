#!/usr/bin/env bash
# Cloud Agent start: per-boot reconciliation.
# Ensures the PostgreSQL daemon is running before the dev server starts.
set -euo pipefail

cd "$(dirname "$0")/.."

if [ "$(id -u)" -eq 0 ]; then
  SUDO=""
else
  SUDO="sudo"
fi

PG_VERSION=16
PG_CLUSTER=main

# Detect the installed major version (fall back to configured default).
if [ ! -d "/etc/postgresql/${PG_VERSION}/${PG_CLUSTER}" ]; then
  DETECTED="$(ls /etc/postgresql 2>/dev/null | sort -n | tail -1 || true)"
  if [ -n "${DETECTED}" ]; then
    PG_VERSION="${DETECTED}"
  fi
fi

echo "==> Starting PostgreSQL ${PG_VERSION}/${PG_CLUSTER}"
$SUDO pg_ctlcluster "${PG_VERSION}" "${PG_CLUSTER}" start || true

# Wait for readiness so dependent services can connect immediately.
for _ in $(seq 1 30); do
  if $SUDO -u postgres pg_isready -q 2>/dev/null; then
    echo "==> PostgreSQL is ready"
    break
  fi
  sleep 1
done
