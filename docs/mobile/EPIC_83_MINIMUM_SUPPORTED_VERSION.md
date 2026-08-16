# EPIC 83 — Minimum Supported Version + Alpha Baseline

**Goal:** Make `0.1.2-alpha` the first officially supported Closed Alpha release and end support for `0.1.0-alpha`.

## Version policy

| Version | versionCode | Status |
|---------|-------------|--------|
| `0.1.0-alpha` | 1 | **Prototype** — unsupported |
| `0.1.1-alpha` | 2 | **Transitional** — not guaranteed |
| `0.1.2-alpha` | 3 | **First supported Closed Alpha** |
| `0.1.3+` | 4+ | Supported via MRP seamless updates |

## Deliverable 1 — Minimum Supported Version

Platform constant:

```ts
minimumSupportedVersionCode = 3  // 0.1.2-alpha
```

When `clientVersionCode < minimumSupportedVersionCode`, `/api/mobile/update` returns:

```json
{
  "updateState": "UNSUPPORTED_CLIENT",
  "minimumVersionCode": 3,
  "minimumVersionName": "0.1.2-alpha",
  "downloadUrl": "...",
  "reason": "CLIENT_TOO_OLD"
}
```

Implementation: `lib/mobile-release-platform/baseline.ts`, `update-service/unsupported-client.ts`.

## Deliverable 2 — Unsupported Client Screen

Mobile screen (`UnsupportedClientScreen`) shown during boot when update check returns `UNSUPPORTED_CLIENT`:

- No infinite splash
- No session restore or navigation
- Primary action: **Скачать новую версию**

## Deliverable 3 — Boot Hardening

Pipeline (`apps/mobile/src/boot/run-startup-pipeline.ts`):

```text
Splash → Bootstrap (timeout) → Remote Config (timeout) → Update Check → Session Restore → Navigation
```

Each step: timeout, telemetry, retry on hard failure.

## Deliverable 4 — Release Lifecycle (mandatory from 0.1.2)

```text
build → publish → MRP → update available → install → telemetry → adoption % → rollout → rollback
```

Every Closed Alpha release MUST follow this lifecycle. Gate: `npm run mobile:epic-83:gate`.

## Deliverable 5 — Legacy removal

Removed:

- `lib/mobile-release-platform/update-service/legacy.ts`
- Version-aware legacy update route stripping
- `tests/mobile-old-client-boot-compat.test.ts`

## Gate

```bash
npm run mobile:epic-83:gate
npm run build
cd apps/mobile && npm run typecheck
```

## Definition of Done

```text
0.1.0 installed → Unsupported Screen → Download 0.1.2 → automatic updates → 0.1.3 → …
```

Physical Android acceptance: **NOT RUN** until `0.1.2-alpha` APK is built and published.
