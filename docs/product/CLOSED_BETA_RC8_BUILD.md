# Closed Beta RC8 — Android Build Record

**Candidate:** `0.1.13-beta.1` (versionCode `13`)  
**Status:** `READY_FOR_PHYSICAL_VALIDATION`  
**Recorded:** 2026-08-23

## Purpose

First Closed Beta build after EPIC 152 (Seller Transaction Loop) and EPIC 154 (Closed Beta Critical Path).

Physical scenario target: **buyer → order → seller → processing → chat → return to app**.

## Version

| Field | Value |
|-------|-------|
| Package | `ru.lot.marketplace.alpha` |
| versionName | `0.1.13-beta.1` |
| versionCode | `13` |
| RC label | RC8 |
| Channel | CLOSED_BETA |
| Environment | staging |
| Previous RC | RC7 `0.1.12-beta.1` (code 12) |

## RC8 features

| Area | Delivery |
|------|----------|
| EPIC 152 | Seller sales tabs, order status actions, buyer order detail timeline |
| EPIC 154 | Checkout return deep link, success banner, duplicate order protection |
| EPIC 154 | Seller storefront trust block, beta tester guide |

## Artifact

| Field | Value |
|-------|-------|
| Path | `artifacts/closed-beta-rc8/lot_android_closed_beta_0.1.13_beta.1.apk` |
| SHA256 | `acbb09c86c2ff038bc11135bbb28606ed08d9e136c33a5f897222e69570991e1` |
| Size | 43,543,214 bytes |

## Gates

```bash
npm run build
npm run mobile:typecheck
npm run mobile:test
npm run mobile:release-gate
npm run release:pipeline:verify
npm run mobile:epic-152:gate
npm run mobile:epic-154:gate
npm run mobile:rc8:staging-gate
npm run mobile:rc8:apk-verify
node scripts/verify-android-apk.mjs artifacts/closed-beta-rc8/lot_android_closed_beta_0.1.13_beta.1.apk
```

## MRP publish

```bash
npm run mobile:rc8:mrp-publish
npm run mobile:rc8:update-verify
```

## Physical validation

**Status: `NOT_RUN`** — see `artifacts/closed-beta-rc8/physical-checklist.json`.

Test accounts: `buyer@demo.lot` / `seller@demo.lot` / `demo1234`
