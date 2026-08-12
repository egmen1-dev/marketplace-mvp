# Deployment flow — Git to staging acceptance

**Scope:** Railway staging (`https://web-production-e56fb.up.railway.app`).  
**Vercel production** is a separate pipeline — do not change prod env without owner GO.

---

## Pipeline overview

```
GitHub main (push)
       ↓
Railway Nixpacks build
  • node scripts/write-build-info.mjs  → lib/build-info.generated.json
  • npx prisma generate
  • npm run build
       ↓
Container start
  • npx prisma migrate deploy
  • npm run start
       ↓
Railway healthcheck
  • GET /api/health → { ok: true }
       ↓
Deploy acceptance (manual / CI)
  • node scripts/deploy-verify.mjs <commit>
  • Playwright staging specs
```

---

## Why deploy drift happens

Railway staging has **not** always auto-redeployed on every `main` push. Symptoms:

- Code merged to `main`, but staging still serves an old layout chunk
- `/api/analytics/events` returns 404 while `/api/health` returns 200
- UX hotfixes pass locally but fail on staging acceptance

**Root cause:** staging deploy is decoupled from Git unless Railway GitHub integration triggers a build, or someone runs `railway up`. Healthcheck only verifies DB/auth — not commit SHA.

**Fix (DEVOPS-001):** public build marker at `GET /api/version` + `scripts/deploy-verify.mjs` that fails when commit ≠ expected.

---

## How to verify staging updated

After pushing to `main`, record the short SHA:

```bash
git rev-parse --short HEAD
# e.g. 58e681f
```

### 1. Version marker (fast)

```bash
curl -sS https://web-production-e56fb.up.railway.app/api/version | jq
```

Expected (example after DEVOPS-001.1 @ `a2407cc`):

```json
{
  "environment": "staging",
  "commit": "a2407cc",
  "buildTime": "2026-08-12T20:15:00.000Z",
  "version": "0.1.0"
}
```

### 2. Health (includes version)

```bash
curl -sS https://web-production-e56fb.up.railway.app/api/health | jq '.ok, .version'
```

Legacy fields (`ok`, `service`, `timestamp`, `checks`) are unchanged.

### 3. Automated verify

```bash
EXPECTED_COMMIT=a2407cc node scripts/deploy-verify.mjs
# or
node scripts/deploy-verify.mjs a2407cc
```

Exit `0` = staging matches commit and critical routes respond.  
Exit `1` = drift or broken deploy — **do not run ads/analytics acceptance**.

---

## Railway configuration

| Setting | Value |
|---------|--------|
| `APP_ENV` | `staging` (recommended on Railway `web` service) |
| `NEXT_PUBLIC_APP_URL` | `https://web-production-e56fb.up.railway.app` |
| Build | `node scripts/write-build-info.mjs && npx prisma generate && npm run build` |
| Start | `npx prisma migrate deploy && npm run start` |
| Healthcheck | `/api/health` |

Railway injects `RAILWAY_GIT_COMMIT_SHA` at build/runtime when GitHub-linked.  
`write-build-info.mjs` bakes commit + `buildTime` into `lib/build-info.generated.json`.

---

## Manual redeploy (if drift detected)

1. Railway Dashboard → project `marketplace-mvp-backup` → service `web`
2. **Deployments** → **Redeploy** latest, or connect GitHub auto-deploy on `main`
3. Wait for healthcheck green
4. Run `node scripts/deploy-verify.mjs $(git rev-parse --short HEAD)`

CLI (requires `railway login`):

```bash
railway link
railway up --service web
```

---

## Acceptance after deploy

1. `node scripts/deploy-verify.mjs <sha>`
2. Feature-specific scripts (e.g. `scripts/ux0051-railway-acceptance.mjs`)
3. Playwright: `npx playwright test -c playwright.railway.config.ts`

Only proceed to ad measurement / release sign-off when version commit matches `main`.

---

## Successful verification example (DEVOPS-001.1)

After Railway redeploys `main` @ `a2407cc`, run the full acceptance cycle:

```bash
git rev-parse --short HEAD   # → a2407cc
```

### 1. Version marker

```bash
curl -sS https://web-production-e56fb.up.railway.app/api/version | jq
```

```json
{
  "environment": "staging",
  "commit": "a2407cc",
  "buildTime": "2026-08-12T20:15:00.000Z",
  "version": "0.1.0"
}
```

### 2. Health (includes version)

```bash
curl -sS https://web-production-e56fb.up.railway.app/api/health | jq '.ok, .version'
```

```json
true
{
  "commit": "a2407cc",
  "buildTime": "2026-08-12T20:15:00.000Z"
}
```

### 3. Deploy verify (7/7)

```bash
node scripts/deploy-verify.mjs a2407cc
```

```
Base URL: https://web-production-e56fb.up.railway.app
Expected commit: a2407cc
PASS — GET /api/version → 200: status=200
PASS — Version environment present: staging
PASS — Version commit matches expected: got=a2407cc
PASS — Version buildTime present: 2026-08-12T20:15:00.000Z
PASS — GET /api/health → 200: status=200
PASS — Health version.commit matches expected: got=a2407cc
PASS — Health database check OK
PASS — GET / → 200: status=200
PASS — GET /catalog → 200: status=200
PASS — GET /api/version → 200: status=200
PASS — GET /product/<id> → 200: status=200
PASS — POST /api/analytics/events → 200: status=200

--- SUMMARY ---
Passed: 7/7
Deploy verification passed.
```

### 4. Analytics baseline (UX-005)

Quick API + cookie checks:

```bash
# POST analytics event
curl -sS -X POST https://web-production-e56fb.up.railway.app/api/analytics/events \
  -H 'Content-Type: application/json' \
  -d '{"event":"page_view","route":"/","visitorId":"acceptance-check"}' | jq
# → { "ok": true }

# Admin funnel dashboard (after sign-in as admin@demo.lot)
open https://web-production-e56fb.up.railway.app/admin/analytics
# Expect: Visitors, UTM sources, Funnel dashboard, Ads measurement baseline
```

Landing with UTM sets cookies `lot_vid` and `lot_utm` (check DevTools → Application → Cookies).

### 5. Playwright (2/2)

```bash
npx playwright test tests/e2e/ads-measurement.spec.ts -c playwright.railway.config.ts
```

```
Running 2 tests using 1 worker
  ✓ VK mobile funnel — UTM cookies + conversion events
  ✓ VK mobile checkout — checkout_start after sign-in

  2 passed
```

**Gate:** only mark **READY FOR ADS MEASUREMENT: YES** when steps 1–5 all pass on live Railway staging.

---

## Environment labels

| Host | `APP_ENV` | `/api/version.environment` |
|------|-----------|------------------------------|
| Railway staging | `staging` (set explicitly) | `staging` |
| Vercel production | `production` | `production` |
| Local dev | unset | `development` |

No secrets, database URLs, or env values are exposed by version/health endpoints.
