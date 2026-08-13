# Railway staging image (does not affect Vercel production).
# Strategy: GitHub → Railway DOCKERFILE (Nixpacks is deprecated on Metal).

FROM node:20-bookworm-slim AS base
WORKDIR /app
RUN apt-get update -y \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

FROM base AS deps
COPY package.json package-lock.json ./
# postinstall runs `prisma generate` — schema must exist before npm ci
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
COPY --from=builder /app/package.json /app/package-lock.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/next.config.ts /app/tsconfig.json ./
COPY --from=builder /app/lib/build-info.generated.json ./lib/build-info.generated.json
EXPOSE 8080
# Explicit host/port so Railway healthchecks can reach the process.
CMD ["sh", "-c", "npx prisma migrate deploy && exec npx next start -H 0.0.0.0 -p ${PORT:-8080}"]
