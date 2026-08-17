# Seamless Update Test Plan — 0.1.2 → 0.1.3

**Status:** PLANNED (after physical 0.1.2 acceptance PASS)

This is the first **valid** seamless update E2E for Closed Alpha. Prior versions (0.1.0, 0.1.1) are unsupported and must not be used for update-chain testing.

## Controlled test build

| Field | Value |
|-------|-------|
| versionName | `0.1.3-alpha` |
| versionCode | `4` |
| channel | `CLOSED_ALPHA` |
| mandatory | `false` |
| product changes | None required (version bump + release notes only) |

## Expected flow

```text
0.1.2 installed + logged in
↓
Launch → boot → NO_UPDATE or already on latest
↓
Publish 0.1.3 to MRP
↓
Launch → OPTIONAL_UPDATE prompt
↓
Обновить → installer
↓
0.1.3 installed
↓
Launch → session preserved (buyer/seller mode, cart, favorites)
```

## Acceptance criteria

- Session preserved after update
- No re-login unless refresh token revoked
- No duplicate update prompt for same version
- Telemetry: `update_available`, `update_viewed`, `update_install_opened`

## Operator steps (when ready)

1. Bump `apps/mobile` to 0.1.3-alpha / versionCode 4
2. Build APK, GitHub release `closed-alpha-0.1.3`
3. `npm run mobile:closed-alpha:publish-013` (script TBD)
4. Physical device on 0.1.2 → verify update prompt → install → session check
