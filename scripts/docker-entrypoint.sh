#!/bin/sh
# Railway container entrypoint — run pending Prisma migrations once, then start app.
# Prisma migrate deploy uses advisory locks; safe when multiple replicas start together.
set -e

if [ -z "$DATABASE_URL" ]; then
  echo "[entrypoint] WARN: DATABASE_URL unset — skipping prisma migrate deploy"
else
  echo "[entrypoint] Running prisma migrate deploy..."
  if [ -x "./node_modules/prisma/build/index.js" ]; then
    node ./node_modules/prisma/build/index.js migrate deploy
  else
    npx prisma migrate deploy
  fi
  echo "[entrypoint] prisma migrate deploy complete"
fi

exec node server.js
