# Railway Build Pipeline (DEVOPS-002)

## Root cause (2026-08-13)

Staging builds failed on Metal builder `builder-oibyls` with:

```text
Failed to read app source directory
Caused by: No such file or directory (os error 2)
```

This happened for both:

- `railway up` (CLI upload snapshots)
- GitHub-connected deploys (git snapshots)

Nixpacks on Metal is deprecated / unreliable for this project. The failure is **before** install/build — the builder cannot read the unpacked source directory.

## Chosen strategy

**A + B: GitHub → Railway native build with `DOCKERFILE`**

| Option | Verdict |
|--------|---------|
| A GitHub native | Required — no `railway up` |
| B Dockerfile | Selected — stable on Metal |
| C Nixpacks | Avoid — deprecated on Metal |

Flow:

```text
push main
  → GitHub
  → Railway service (repo: egmen1-dev/marketplace-mvp, branch: main)
  → Docker build (Dockerfile)
  → deploy
  → GET /api/version + /api/health
```

## Config

- `railway.toml` → `builder = "DOCKERFILE"`
- `Dockerfile` → Node 20 multi-stage, `prisma generate` + `npm run build`, start with `prisma migrate deploy && npm run start`
- `.dockerignore` → excludes `node_modules`, `.next`, local artifacts (keeps source)

## Ops notes

- Prefer service **`web-v2`** (GitHub + Dockerfile). Legacy `web` / `web-staging` stuck on Metal unpack for Nixpacks/CLI uploads.
- After `web-v2` is healthy, point the public domain `web-production-e56fb.up.railway.app` at it.
- Dockerfile copies `prisma/` before `npm ci` because `postinstall` runs `prisma generate`.
- Vercel production is unchanged
- Do **not** use `railway up` for routine deploys
