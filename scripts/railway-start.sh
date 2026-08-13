#!/bin/sh
set -eu
echo "[start] migrating…"
node ./node_modules/prisma/build/index.js migrate deploy
echo "[start] launching standalone server on ${HOSTNAME:-0.0.0.0}:${PORT:-8080}"
exec node server.js
