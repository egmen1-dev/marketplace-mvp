# EPIC 106 — Staging Deployment Investigation

**Goal:** Determine why Railway staging deploys successfully but returns HTTP 404 for all Beta endpoints.

**Investigation only** — no application logic changes.

---

## ROOT CAUSE

**EPIC 102–105 were never merged into `main`. Railway staging deploys `origin/main` at commit `feb4b8d`, which does not contain any `app/api/product-ops/beta/*/route.ts` files.**

Evidence:

| Source | Finding |
|--------|---------|
| Live staging `GET /api/version` | `commit: "feb4b8d"` |
| `git rev-parse origin/main` | `feb4b8d067bf8b0426909d249c6a99fa21ac15f2` |
| `git ls-tree -r main --name-only app/api/product-ops/beta` | **empty** (no files) |
| `git ls-tree -r main --name-only app/api/product-ops` | only `config`, `feedback`, `session` |
| EPIC 102–105 commits | **not** ancestors of `main` (`git merge-base --is-ancestor` → NO) |
| GitHub PRs #124–#127 | `state: OPEN`, `mergedAt: null` |
| Staging probe | `/api/product-ops/beta/readiness` → **404**; `/api/product-ops/config` → **200** |

Hypothesis **A** and **E** are **CONFIRMED** (same root cause). Hypotheses **B, C, D** are **RULED OUT** (see `artifacts/epic-106/root-cause.json`).

404 (not 503) indicates routes are **not registered** in the deployed build. If routes existed but CCOS were disabled, `ccosApiGuard()` would return **503**.

---

## Part 1 — Beta route files (HEAD / EPIC 105 branch)

| Path | Introducing commit | Export |
|------|-------------------|--------|
| `app/api/product-ops/beta/dashboard/route.ts` | `5303e56` (EPIC 102) | `GET` |
| `app/api/product-ops/beta/journey/route.ts` | `5303e56` (EPIC 102) | `GET` |
| `app/api/product-ops/beta/exit-report/route.ts` | `5303e56` (EPIC 102) | `GET` |
| `app/api/product-ops/beta/performance/route.ts` | `b028271` (EPIC 104) | `GET` |
| `app/api/product-ops/beta/crashes/route.ts` | `b028271` (EPIC 104) | `GET` |
| `app/api/product-ops/beta/readiness/route.ts` | `b028271` (EPIC 104) | `GET` |

No explicit `runtime` or `dynamic` exports (Next.js default route handler behavior).

---

## Part 2 — URL mapping

| Endpoint | Expected URL | Filesystem |
|----------|--------------|------------|
| readiness | `/api/product-ops/beta/readiness` | `app/api/product-ops/beta/readiness/route.ts` |
| dashboard | `/api/product-ops/beta/dashboard` | `app/api/product-ops/beta/dashboard/route.ts` |
| journey | `/api/product-ops/beta/journey` | `app/api/product-ops/beta/journey/route.ts` |
| performance | `/api/product-ops/beta/performance` | `app/api/product-ops/beta/performance/route.ts` |
| exit-report | `/api/product-ops/beta/exit-report` | `app/api/product-ops/beta/exit-report/route.ts` |
| crashes | `/api/product-ops/beta/crashes` | `app/api/product-ops/beta/crashes/route.ts` |

---

## Part 3 — Git reachability

| Ref | SHA |
|-----|-----|
| HEAD (investigation branch) | `134f035` |
| `main` / `origin/main` | `feb4b8d` |

| EPIC | Commit | On `main`? | On HEAD? |
|------|--------|------------|----------|
| 102 | `5303e56` | NO | YES |
| 103 | `81082c4` | NO | YES |
| 104 | `b028271` | NO | YES |
| 105 | `134f035` | NO | YES |

---

## Part 4 — Deployed build metadata

- `scripts/write-build-info.mjs` embeds `RAILWAY_GIT_COMMIT_SHA` or `git rev-parse HEAD` into `lib/build-info.generated.json`.
- Staging reports: `commit: feb4b8d`, `buildTime: 2026-08-16T18:57:44.101Z`, `environment: staging`.
- Deployed build **correctly** reflects **`main`** — not EPIC branches.

---

## Part 5 — Local production build (HEAD)

On EPIC 105 HEAD, `.next/server/app-paths-manifest.json` includes all six beta routes:

- `/api/product-ops/beta/dashboard/route`
- `/api/product-ops/beta/journey/route`
- `/api/product-ops/beta/performance/route`
- `/api/product-ops/beta/crashes/route`
- `/api/product-ops/beta/readiness/route`
- `/api/product-ops/beta/exit-report/route`

`main` branch tree has **zero** beta route source files → they cannot appear in a build from `main`.

---

## Part 6 — Build exclusion analysis

**RULED OUT** for EPIC HEAD: routes compile into server manifest. `.dockerignore` / `.gitignore` do not exclude `app/api/product-ops`. Dockerfile `COPY . .` includes full source.

---

## Part 7 — Railway / Docker

- `railway.toml`: `builder = "DOCKERFILE"`, `startCommand = "node server.js"`
- `next.config.ts`: `output: "standalone"`
- Dockerfile: `WORKDIR /app`, multi-stage, no filtering of `app/api/product-ops`

---

## Part 8 — Ignore files

Neither `.dockerignore` nor `.gitignore` exclude `app/api/product-ops`.

---

## Part 9 — Branch mapping

- Railway deploys **GitHub `main`** (documented in `docs/RAILWAY_BUILD_PIPELINE.md`).
- No `.github/workflows` in repository (no Action override found).
- Staging live commit matches `origin/main` exactly.

---

## Artifacts

```
artifacts/epic-106/
├── deployment-tree.json
├── git-reachability.json
├── route-map.json
├── build-route-map.json
├── railway-config.json
├── docker-report.json
└── root-cause.json
```

---

## Unblock (operator — not done in this EPIC)

Merge EPIC 102 → 103 → 104 → 105 into `main`, then redeploy Railway `web-staging` / `web-v2`. Verify `GET /api/version` commit changes and beta routes return HTTP 200.
