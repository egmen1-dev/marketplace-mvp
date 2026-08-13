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
ARG BUILD_TIME
ENV RAILWAY_GIT_COMMIT_SHA=$RAILWAY_GIT_COMMIT_SHA
ENV BUILD_TIME=$BUILD_TIME
ENV NEXT_TELEMETRY_DISABLED=1
RUN npx prisma generate && npm run build

FROM base AS runner
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=8080
ENV HOSTNAME=0.0.0.0
WORKDIR /app

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/lib/build-info.generated.json ./lib/build-info.generated.json

EXPOSE 8080
CMD ["node", "server.js"]
