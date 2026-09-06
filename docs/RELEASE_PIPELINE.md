# Release Pipeline

Mandatory flow from development to Closed Beta. EPIC 109 hardens this pipeline so production-ready code cannot sit undeployed behind Draft PRs.

## Pipeline

```text
Development
  ↓
Local build          npm run build
  ↓
Typecheck            npm run mobile:typecheck
  ↓
Tests                npm test (or EPIC gate)
  ↓
Create PR            draft=false (see PR policy below)
  ↓
Ready for review     NOT Draft
  ↓
Merge to main
  ↓
Railway deploy       GitHub → main → Docker build → migrate deploy → server
  ↓
Verify SHA           npm run release:pipeline:verify
  ↓
Verify migrations    npm run release:migration:verify
  ↓
Verify staging       critical routes + health (schema compatible)
  ↓
Production gate      npm run product:epic-110:production-release (EPIC 110)
  ↓
Release gate         npm run product:epic-108:release-candidate-final
  ↓
Closed Beta
```

## PR policy (Part 1)

| Creation path | Default draft? | Evidence |
|---------------|----------------|----------|
| **Cursor Cloud Agent → `ManagePullRequest`** | **Yes** | Cloud agent `create_pr` uses `draft: true` unless `draft: false` is passed |
| GitHub UI | No (operator choice) | Draft checkbox |
| `gh pr create` | No (`--draft` optional) | Not used in this repo |

**Rule for Cloud Agents:** always create PRs with `draft: false` unless the user explicitly requests a draft.

Audit draft inventory:

```bash
npm run release:pipeline:pr-audit
```

## Automatic deployment verification (Parts 4–8)

After every Railway deploy from `main`:

```bash
npm run release:pipeline:verify
```

This script:

1. Compares `git rev-parse origin/main` to `GET /api/version` commit on staging
2. Verifies `/api/health` and `/api/version` return **200**
3. Probes critical routes from `release-pipeline/critical-routes.json`
4. Flags mergeable **Draft** PRs targeting `main` as release blockers
5. Writes `artifacts/release-pipeline/*.json`

**Exit code 0** only when deployment can be marked **COMPLETE** (no P0 blockers).

### Critical routes

Configured in `release-pipeline/critical-routes.json`:

| Route | When required |
|-------|----------------|
| `/api/health` | Always |
| `/api/version` | Always |
| `/api/product-ops/config` | Always |
| `/api/product-ops/beta/dashboard` | When source exists on `origin/main` |
| `/api/product-ops/beta/readiness` | When source exists on `origin/main` |
| `/api/mobile/checkout/web-url` | When source exists on `origin/main` (401/403 without auth = registered) |

Routes not yet on `main` are **SKIP** until merged.

### Release blockers (deployment NOT COMPLETE)

- PR still **Draft** and mergeable (production-ready but not marked Ready)
- `origin/main` SHA ≠ Railway `/api/version` commit
- Critical route on `main` returns wrong status (e.g. **404**)
- `/api/health` or `/api/version` not **200**

## Artifacts

```text
artifacts/release-pipeline/
├── release-checklist.json
├── deployment-verification.json
├── route-verification.json
├── release-status.json
├── pipeline-report.json
└── pr-policy-audit.json   (from pr-audit script)
```

## Staging URL

Default: `https://web-production-e56fb.up.railway.app`

Override: `STAGING_BASE_URL=https://your-staging.example`

## Railway

- Branch: **`main`**
- Root directory: **empty** (repository root)
- Builder: **Dockerfile** (`railway.toml`)
- After merge: confirm deploy finished, then run `npm run release:pipeline:verify` and `npm run release:migration:verify`

## Migration release invariant

> A deployment is not release-ready merely because `/api/health` can connect to PostgreSQL. The deployed application schema and database migration state must be compatible.

Release order:

```text
CODE DEPLOY → MIGRATION → SCHEMA COMPATIBILITY → APPLICATION READINESS → STAGING E2E → APK BUILD → MRP → PHYSICAL
```

No APK release when backend schema changed until `release:migration:verify` PASS.

## Related gates

| Gate | When |
|------|------|
| `npm run release:pipeline:verify` | After every staging deploy |
| `npm run release:migration:verify` | After every staging deploy when schema may have changed |
| `npm run product:epic-108:release-candidate-final` | Before Closed Beta invite |
| `npm run mobile:staging-smoke` | Mobile integration smoke |

## Limitation (Part 2)

Cursor Cloud Agent **`ManagePullRequest` default cannot be changed at repository level**. Agents must pass `draft: false` on each `create_pr` call. Documented in `AGENTS.md`.
