# Railway staging image (does not affect Vercel production).
# Strategy: GitHub → Railway DOCKERFILE + Next standalone.
# Migrations: run via one-off `railway run` / CI (see docs/RAILWAY_BUILD_PIPELINE.md).

FROM node:20-bookworm-slim AS base
WORKDIR /app
RUN apt-get update -y \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

FROM base AS deps
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ARG RAILWAY_GIT_COMMIT_SHA
ENV RAILWAY_GIT_COMMIT_SHA=$RAILWAY_GIT_COMMIT_SHA
ENV NEXT_TELEMETRY_DISABLED=1
# Force fresh build marker into the image (also used by /api/version).
RUN node scripts/write-build-info.mjs \
  && npx prisma generate \
  && npm run build \
  && test -f lib/build-info.generated.json \
  && mkdir -p .next/standalone/lib \
  && cp lib/build-info.generated.json .next/standalone/lib/build-info.generated.json

FROM base AS runner
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=8080
ENV HOSTNAME=0.0.0.0
WORKDIR /app

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
# Explicit copy in case standalone tree omitted it
COPY --from=builder /app/lib/build-info.generated.json ./lib/build-info.generated.json
# Prisma migrate deploy on container boot (advisory lock — safe for replicas)
COPY --from=builder /app/prisma ./prisma
COPY --from=deps /app/node_modules/prisma ./node_modules/prisma
COPY --from=deps /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=deps /app/node_modules/@prisma ./node_modules/@prisma
COPY scripts/docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh

EXPOSE 8080
CMD ["./docker-entrypoint.sh"]
