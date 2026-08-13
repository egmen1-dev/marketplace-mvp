#!/bin/sh
set -eu
export PATH="/app/node_modules/.bin:$PATH"
echo "[start] migrating…"
npx prisma migrate deploy
echo "[start] launching standalone server on ${HOSTNAME:-0.0.0.0}:${PORT:-8080}"
exec node server.js
