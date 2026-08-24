# Closed Beta RC9.1 — Android Build Record

**Candidate:** `0.1.14-beta.2` (versionCode `15`)  
**Status:** `READY_FOR_SELLER_PHYSICAL_TEST`  
**Recorded:** 2026-08-24

## Purpose

Stabilization build after EPIC 158.1 (Seller LOT Creation UX Hardening).

Primary goal: a non-technical seller can create, save, resume, and publish a LOT without losing data.

## Preconditions

| Gate | Result |
|------|--------|
| PR #161 merged (EPIC 158.1) | PASS |
| mobile:typecheck | PASS |
| EPIC 158 / 158.1 gates | PASS |
| release:pipeline:verify | PASS |

## Version

| Field | Value |
|-------|-------|
| Package | `ru.lot.marketplace.alpha` |
| versionName | `0.1.14-beta.2` |
| versionCode | `15` |
| RC label | RC9.1 |
| Channel | CLOSED_BETA |
| Environment | staging |
| Previous RC | RC9 `0.1.14-beta.1` (code 14) |

## RC9.1 features

| Area | Delivery |
|------|----------|
| EPIC 158.1 | Autosave, restore prompt, pickup in draft, error preservation |
| Language | LOT-only seller copy (no черновик / товар in create flow) |
| Empty states | «У вас пока нет ЛОТов» + «Создать первый ЛОТ» |

## Gates

```bash
npm run build
npm run mobile:typecheck
npm test
npm run mobile:epic-158:gate
npm run mobile:epic-158-1:gate
npm run mobile:rc9.1:staging-gate
npm run mobile:rc9.1:apk-verify
npm run release:pipeline:verify
```

## MRP publish

```bash
npm run mobile:rc9.1:mrp-publish
npm run mobile:rc9.1:update-verify
```

## Physical validation

**Status: `NOT_RUN`** — `artifacts/closed-beta-rc9.1/physical-checklist.json`

Test account: `seller@demo.lot` / `demo1234`

## Verdict

`READY_FOR_SELLER_PHYSICAL_TEST`
