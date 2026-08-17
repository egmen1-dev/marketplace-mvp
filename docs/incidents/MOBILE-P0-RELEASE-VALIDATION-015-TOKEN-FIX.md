# P0-2 Release Validation — 0.1.5-alpha (token-fix)

**Status:** PASS (after GitHub + MRP sync)

## Canonical artifact

| Field | Value |
|-------|-------|
| File | `lot-android-alpha-0.1.5.apk` |
| SHA256 | `174295aae57a346012821d38b167fa0f6a96df7817ec2756e8ce9b1d85348961` |
| Size | 93,890,987 bytes |
| versionName | `0.1.5-alpha` |
| versionCode | `6` |
| gitCommit | `cadbf50` |

## Superseded (do not distribute)

| SHA256 | Reason |
|--------|--------|
| `a468413a…` | Route-graph crash — `colors of undefined` before ROOT_LAYOUT_INIT |

## P0-1 Route Graph Crash — CLOSED

Firebase Test Lab evidence:

- ROOT_LAYOUT_INIT reached
- BOOT_PIPELINE_INIT reached
- UI rendered
- Absent: AnyTypeProvider, getGlobalHandler, colors undefined, ErrorBoundary undefined

## Download

https://github.com/egmen1-dev/marketplace-mvp/releases/download/closed-alpha-0.1.5/lot-android-alpha-0.1.5.apk
