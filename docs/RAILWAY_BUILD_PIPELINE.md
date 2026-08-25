# Railway Build Pipeline (DEVOPS-002)

## Root cause (2026-08-13)

Staging builds failed on Metal builder `builder-oibyls` with:

```text
Failed to read app source directory
Caused by: No such file or directory (os error 2)
```

This happened for both:

- `railway up` (CLI upload snapshots)
- GitHub-connected deploys on the **legacy** `web` service (corrupted Metal snapshot affinity)

Nixpacks on Metal is deprecated / unreliable for this project.

## Chosen strategy

**A + B: GitHub → Railway native build with `DOCKERFILE` + Next `output: "standalone"`**

| Option | Verdict |
|--------|---------|
| A GitHub native | Required — no `railway up` |
| B Dockerfile + standalone | Selected — stable on Metal |
| C Nixpacks | Avoid — deprecated on Metal |

Flow:

```text
push main
  → GitHub
  → Railway service **web-v2** (repo: egmen1-dev/marketplace-mvp, branch: main)
  → Docker build (Dockerfile, Next standalone)
  → `node server.js`
  → GET /api/version + /api/health
```

## Config

- `railway.toml` → `builder = "DOCKERFILE"`
- `next.config.ts` → `output: "standalone"`
- `Dockerfile` → multi-stage Node 20; runner copies `.next/standalone` + static assets
- `.dockerignore` → excludes `node_modules`, `.next`, local artifacts

## Migrations

Container boot runs pending migrations before the app starts:

```text
./docker-entrypoint.sh
  → prisma migrate deploy   # advisory lock — safe for multiple replicas
  → node server.js
```

`Dockerfile` copies `prisma/` + Prisma CLI into the runner image. `railway.toml` uses `startCommand = "./docker-entrypoint.sh"`.

**Invariant:** a deployment is not release-ready when application code requires schema changes but the database migration state is incompatible. `/api/health` reports:

```json
{
  "checks": {
    "database": {
      "reachable": true,
      "schemaCompatible": true
    }
  }
}
```

When schema is incompatible, health returns **503** (not 200 with hidden breakage).

Verify after deploy:

```bash
npm run release:migration:verify
npm run release:pipeline:verify
```

Manual one-off (still supported):

```bash
railway run --service web-v2 -- npx prisma migrate deploy
```

## Ops notes

- Active staging service: **`web-v2`** → `https://web-v2-production-d733.up.railway.app`
- Legacy `web-staging` kept online temporarily; cut public domain `web-production-e56fb.up.railway.app` over after acceptance
- Vercel production is unchanged
- Do **not** use `railway up` for routine deploys
