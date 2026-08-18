# EPIC 109 — Release Pipeline Hardening

**Goal:** Prevent production-ready EPICs remaining undeployed because PRs stay Draft.

## Deliverables

| Item | Path |
|------|------|
| Release pipeline doc | `docs/RELEASE_PIPELINE.md` |
| Critical routes config | `release-pipeline/critical-routes.json` |
| Verify script | `scripts/release-pipeline-verify.ts` |
| PR policy audit | `scripts/release-pipeline-pr-policy-audit.ts` |
| Artifacts | `artifacts/release-pipeline/` |

## Commands

```bash
npm run release:pipeline:verify      # SHA + health + routes + blockers
npm run release:pipeline:pr-audit    # Draft PR inventory
```

## PR default mode

**Cannot change Cursor global default.** Agents must use `ManagePullRequest` with `draft: false`. See `AGENTS.md` → Release pipeline.

## Acceptance criteria automation

`release:pipeline:verify` checks:

- SHA parity (GitHub `origin/main` ↔ Railway `/api/version`)
- Health endpoints 200
- Critical routes (conditional on `origin/main` source tree)
- Draft PR blockers via `gh`
- Writes `pipeline-report.json` with `COMPLETE` or `BLOCKED`
