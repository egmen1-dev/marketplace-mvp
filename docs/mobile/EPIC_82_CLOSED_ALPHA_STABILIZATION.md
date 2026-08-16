# EPIC 82 — Closed Alpha Stabilization & Seamless Updates

> Stabilize → Polish → Update → Observe → Closed Alpha

## Goal

Prepare Android Alpha ЛОТ for real Closed Alpha testers (5–10). **No large new product features.**

## Wave 2 merge

PR #92 (EPIC 81 Wave 1+2) merged to `main`.

## Version bump

| Field | 0.1.0-alpha | 0.1.1-alpha |
|-------|-------------|-------------|
| versionName | 0.1.0-alpha | 0.1.1-alpha |
| versionCode | 1 | 2 |
| GitHub tag | closed-alpha-0.1.0 | closed-alpha-0.1.1 |

## Seamless update flow (v1)

```text
Launch → Bootstrap → UpdateHost → /api/mobile/update
→ updateState (NO | OPTIONAL | RECOMMENDED | REQUIRED)
→ UpdateGate modal → Linking.openURL(downloadUrl) → Android installer
```

Update states implemented in `lib/mobile-release-platform/update-service/resolve-update-state.ts`.

Defer/cooldown: 24h via SecureStore (`lot_update_defer_v1`).

Analytics events: `update_available`, `update_viewed`, `update_started`, `update_deferred`, `update_downloaded`, `update_install_opened`, `update_failed`.

## APK publish

1. Build release APK (`docs/mobile/APP_SHELL_0_ANDROID_BUILD.md`)
2. `sha256sum lot-android-alpha-0.1.1.apk` → update `lib/mobile-release-platform/constants.ts`
3. Upload GitHub Release `closed-alpha-0.1.1`
4. Publish to MRP:

```bash
npm run mobile:closed-alpha:publish-011
```

## Gates

```bash
npm run build
cd apps/mobile && npm run typecheck
npm run mobile:release-gate
npm run mobile:epic-82:gate
```

Set operator flags after physical device pass:

```bash
export PHYSICAL_ANDROID_PASS=true
export SEAMLESS_UPDATE_PASS=true
npm run mobile:epic-82:gate
```

## Physical acceptance

Run `docs/mobile/EPIC_81_PHYSICAL_ACCEPTANCE_CHECKLIST.md` on device with new 0.1.1-alpha build.

Hard update test (Part 51):

```text
Device on 0.1.0-alpha → launch → "Доступна 0.1.1-alpha" → Обновить → Android installer
```

## Product deliverables

1. **Closed Alpha UX Stable** — buyer + seller core flows without P0 on physical Android
2. **Seamless Update Experience** — no manual APK hunting

## Release deliverables

1. **0.1.1-alpha Release** — MRP + HTTPS artifact
2. **Update cycle 0.1.0 → 0.1.1** — physical E2E
3. **Closed Alpha 5–10** — cohort via MRP
4. **POP stability data** — version distribution + update funnel
5. **Hotfix path** — documented 0.1.2-alpha workflow

## Wave 2 gaps addressed in code

- Cart line item thumbnails (`apps/mobile/app/cart.tsx`)
- Wallet full ledger — **not connected** (no mobile API; empty state only)
- Seller sales detail — **not connected** (no existing endpoint)

## Final matrix (operator fills physical columns)

| Gate | Result |
|------|--------|
| Wave 2 deployed | merge #92 |
| New APK built | operator |
| VersionCode bumped | 2 |
| APK hosted | GitHub Release |
| MRP release published | `publish-011` |
| Update check | `/api/mobile/update` |
| Optional update | UpdateGate |
| Required update foundation | REQUIRED_UPDATE state |
| Update download | browser/installer v1 |
| Android installer opens | physical |
| Update analytics | telemetry events |
| Version distribution | POP release intel |
| 0.1.0 → 0.1.1 update | physical |
| Physical Android | NOT_RUN in cloud |
| P0 | target 0 |
| P1 | target ≤3 |
| Closed Alpha | WATCH |

## Verdicts

```text
EPIC 82: ACCEPTED after automated gate + physical PASS
APP-SHELL-1: BLOCKED until hard gate
```

See root `AGENTS.md` for post-APK product rules.
