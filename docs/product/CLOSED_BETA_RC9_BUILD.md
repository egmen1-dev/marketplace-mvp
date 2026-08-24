# Closed Beta RC9 — Android Build Record

**Candidate:** `0.1.14-beta.1` (versionCode `14`)  
**Status:** `READY_FOR_PHYSICAL_VALIDATION`  
**Recorded:** 2026-08-24

## Purpose

First Closed Beta build after EPIC 157 (Mobile UX Polish) and EPIC 158 (Seller LOT Creation MVP).

Physical scenario target: **seller creates LOT → catalog → buyer order → seller processes → chat**.

## Preconditions

| Gate | Result |
|------|--------|
| PR #157 merged (EPIC 157) | PASS |
| PR #158 merged (EPIC 158) | PASS |
| Railway deployed to `aa6c3aa` | PASS |
| mobile:typecheck | PASS |
| EPIC 157/158 gates | PASS |
| release:pipeline:verify | PASS |

## Version

| Field | Value |
|-------|-------|
| Package | `ru.lot.marketplace.alpha` |
| versionName | `0.1.14-beta.1` |
| versionCode | `14` |
| RC label | RC9 |
| Channel | CLOSED_BETA |
| Environment | staging |
| Previous RC | RC8 `0.1.13-beta.1` (code 13) |

## RC9 features

| Area | Delivery |
|------|----------|
| EPIC 157 | ProductCard polish, image fallback, cart stepper, category chips, empty states |
| EPIC 158 | Native «Создать ЛОТ» wizard, Мои ЛОТы tabs, local draft, mobile seller APIs |

## Artifact

| Field | Value |
|-------|-------|
| Path | `artifacts/closed-beta-rc9/lot_android_closed_beta_0.1.14_beta.1.apk` |
| SHA256 | `4778afadaddae4a9675c84f17fa60c473ac72894d7f153d9324a45cad1865304` |
| Size | 43,589,106 bytes |

## Gates

```bash
npm run build
npm run mobile:typecheck
npm run mobile:epic-157:gate
npm run mobile:epic-158:gate
npm run mobile:epic-152:gate
npm run mobile:epic-154:gate
npm run release:pipeline:verify
npm run mobile:rc9:staging-gate
npm run mobile:rc9:apk-verify
node scripts/verify-android-apk.mjs artifacts/closed-beta-rc9/lot_android_closed_beta_0.1.14_beta.1.apk
```

## MRP publish

```bash
npm run mobile:rc9:mrp-publish
npm run mobile:rc9:update-verify
```

## Physical validation

**Status: `NOT_RUN`** — see `artifacts/closed-beta-rc9/physical-checklist.json`.

Test accounts: `buyer@demo.lot` / `seller@demo.lot` / `demo1234`

## Verdict

`READY_FOR_PHYSICAL_VALIDATION`
