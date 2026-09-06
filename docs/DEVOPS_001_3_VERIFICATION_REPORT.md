# DEVOPS-001.3 — Railway Deployment Trigger Verification Report

**Date:** Thursday, Aug 13, 2026, 07:22 UTC  
**Staging URL:** https://web-production-e56fb.up.railway.app  
**Target commit:** `995a9f6` (DEVOPS-001.2 empty trigger on `main`)  
**Latest `main` after verification:** `93d458d` (DEVOPS-001.3 empty re-trigger)

---

## Executive Summary

**GitHub → Railway deploy did NOT occur.** Staging remains on a build **older than `a2407cc`** (no `/api/version`, no `version` in `/api/health`). Two empty commits were pushed to `main` via GitHub; neither updated staging after 10+ minutes of polling.

**READY FOR ADS MEASUREMENT: NO**

---

## 1. Railway Configuration (repo-side verified)

| Setting | Expected | Repo evidence |
|---------|----------|---------------|
| Repository | `egmen1-dev/marketplace-mvp` | Git remote + docs |
| Branch | `main` | Push targets `origin/main` |
| Service | `web` | `docs/BACKUP_DEPLOYMENT.md`, `railway.toml` |
| Root directory | `/` | `railway.toml` at repo root |
| Build | Nixpacks | `railway.toml` `[build] builder = "NIXPACKS"` |
| Build command | `write-build-info` → `prisma generate` → `npm run build` | `railway.toml` |
| Start command | `prisma migrate deploy` → `npm run start` | `railway.toml` |
| Healthcheck | `/api/health` | `railway.toml` |

**Dashboard-only settings (could NOT verify programmatically):**

| Setting | Expected | Status |
|---------|----------|--------|
| Auto Deploy | ON | **UNKNOWN — likely OFF or webhook broken** |
| GitHub source linked to `web` | Yes | **UNKNOWN** |
| Active deployment commit | `995a9f6` | **NOT deployed** |

---

## 2. GitHub Deploy Triggers (no `railway up`)

| Event | Commit | Time (UTC) | Staging changed? |
|-------|--------|------------|------------------|
| DEVOPS-001.2 empty push | `995a9f6` | 2026-08-13 ~06:27 | No |
| DEVOPS-001.3 empty push | `93d458d` | 2026-08-13 ~07:15 | No |

GitHub `PushEvent` records confirm both pushes reached `refs/heads/main`. No GitHub Deployments or Environments registered for this repo.

---

## 3. Expected Build Log Steps (NOT OBSERVED)

Could not read Railway build logs (CLI: `Unauthorized`, Dashboard: login required). Expected successful pipeline:

```
clone repository
checkout commit 995a9f6   # or 93d458d if latest main
npm install
prisma migrate deploy
npm run build
npm start
```

**Observed instead:** no new deployment; old container continues serving traffic.

---

## 4. Deployed Commit (inferred)

| Signal | Live staging | Code at `995a9f6` |
|--------|--------------|-------------------|
| `GET /api/version` | **404** (HTML page) | 200 JSON |
| `GET /api/health` → `version` | **absent** | `{ commit, buildTime, … }` |
| `POST /api/analytics/events` | **404** | 200 |
| Health `checks` shape | legacy (no version) | includes `version` |

**Conclusion:** staging build is **before `a2407cc`** (~10 commits behind `main`). Previously correlated with **`58e681f`** era (UX-005). Exact SHA unconfirmed without Railway dashboard or `/api/version`.

---

## 5. Endpoint Verification

### `GET /api/version`

```
HTTP 404
(body: Next.js 404 HTML page)
```

Expected:

```json
{ "commit": "995a9f6", "environment": "staging", "buildTime": "…", "version": "0.1.0" }
```

### `GET /api/health`

```json
{
  "ok": true,
  "service": "marketplace-mvp",
  "timestamp": "2026-08-13T07:22:06.314Z",
  "checks": {
    "database": { "ok": true },
    "auth": { "ok": true },
    "storage": { "ok": true, "optional": true, "detail": "configured" },
    "cron": { "ok": true, "optional": true, "detail": "configured" },
    "stripe": { "ok": false, "optional": true, "detail": "not_configured" }
  }
}
```

**Missing:** `version.commit` (expected `995a9f6`).

---

## 6. `node scripts/deploy-verify.mjs 995a9f6`

```
Base URL: https://web-production-e56fb.up.railway.app
Expected commit: 995a9f6
FAIL — GET /api/version → 200: status=404
PASS — GET /api/health → 200: status=200
PASS — GET / → 200: status=200
PASS — GET /catalog → 200: status=200
FAIL — GET /api/version → 200: status=404
PASS — GET /product/cmsmzsjx0002xy0w60fa73kqf → 200: status=200
FAIL — POST /api/analytics/events → 200: status=404
FAIL — POST ad_landing_view + UTM → 200: status=404

--- SUMMARY ---
Passed: 4/8
Deploy verification failed.
```

Exit code: **1**

---

## 7. Why Railway Did Not Deploy

Most probable causes (ranked):

1. **Auto Deploy OFF** — pushes to `main` do not enqueue Railway builds.
2. **GitHub integration misconfigured** — wrong repo, branch, service, or root path on `web`; or integration disconnected after manual `railway up` deploys.
3. **Build failed silently** — new build errored; Railway kept previous healthy deployment (healthcheck does not compare commit SHA).
4. **Wrong service receiving webhooks** — project linked but deploy target is not `web`.

Evidence supporting (1–2):

- Two verified GitHub pushes with zero staging drift over 10+ minutes.
- No Railway CLI/API access to confirm deployment queue.
- Known drift pattern documented in `docs/DEPLOYMENT_FLOW.md`.

---

## 8. Required Manual Actions (owner)

1. Railway Dashboard → `marketplace-mvp-backup` → service **`web`**
2. **Settings → Source:** confirm `egmen1-dev/marketplace-mvp`, branch **`main`**, root **`/`**
3. Enable **Auto Deploy**
4. **Deployments** → Deploy latest `main` (or Redeploy) — inspect build log for clone / checkout / npm / prisma / build / start
5. Re-run:

```bash
curl -sS https://web-production-e56fb.up.railway.app/api/version | jq '.commit'
node scripts/deploy-verify.mjs $(git rev-parse --short origin/main)
```

---

## 9. READY FOR ADS MEASUREMENT

| Gate | Status |
|------|--------|
| Staging commit = `main` | **NO** |
| `/api/version` | **FAIL** |
| `/api/analytics/events` + `ad_landing_view` | **FAIL** |
| `deploy-verify.mjs` | **FAIL (4/8)** |
| `/admin/ads` panel (ADS-READY) | **NOT VERIFIABLE** on stale build |

### **READY FOR ADS MEASUREMENT: NO**

Blocked until Railway deploys current `main` and `deploy-verify` passes.

---

**Report generated:** 2026-08-13 07:22 UTC  
**Scripts:** `scripts/deploy-verify.mjs`, `railway.toml`  
**Related:** `docs/DEPLOYMENT_FLOW.md`, `docs/DEVOPS_001_2_VERIFICATION_REPORT.md`
