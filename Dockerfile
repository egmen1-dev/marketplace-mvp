# Railway staging image (does not affect Vercel production).
# Strategy: GitHub → Railway DOCKERFILE + Next standalone.
# Migrations: prisma migrate deploy on container boot via docker-entrypoint.sh.

FROM node:20-bookworm-slim AS base
WORKDIR /app
RUN apt-get update -y \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

FROM base AS deps
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci

FROM base AS prisma-runtime
COPY package.json package-lock.json ./
COPY prisma ./prisma
COPY scripts/collect-prisma-cli-runtime.mjs ./scripts/collect-prisma-cli-runtime.mjs
# Full lockfile install ensures Prisma CLI transitive closure (effect, c12, …) is resolved.
RUN npm ci --ignore-scripts \
  && npx prisma generate \
  && node scripts/collect-prisma-cli-runtime.mjs /app /prisma-cli-runtime \
  && node /prisma-cli-runtime/node_modules/prisma/build/index.js --version

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
# Prisma migrate deploy on container boot — complete CLI closure, not cherry-picked packages
COPY --from=prisma-runtime /prisma-cli-runtime/prisma ./prisma
COPY --from=prisma-runtime /prisma-cli-runtime/node_modules/ ./node_modules/
COPY scripts/docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh

EXPOSE 8080
CMD ["./docker-entrypoint.sh"]
