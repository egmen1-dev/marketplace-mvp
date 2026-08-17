# EPIC 84 — Sprint 8: Profile & Personal Experience

## Before audit

Legacy `profile.tsx` was a settings menu: flat rows, legacy `theme/tokens`, Alert-style logout, no account card, no shopping activity, no saved data rails, no diagnostics section, no POP telemetry, no offline cache, no skeleton loading.

**Baseline scores:** Marketplace 5.5 / Feeling 5.2 / Trust 5.8 / Profile UX 5.4

## Benchmark

| Platform | Pattern adopted |
|----------|-----------------|
| Wildberries | Account header with avatar, order shortcuts, activity stats |
| Ozon | Quick action tiles, personal center feel |
| Amazon | Account hub with shopping activity |
| Apple Store | Premium account card, build/update info |
| Google Play | Update channel card, diagnostics as user-facing section |

## UX decisions

1. **Structure:** Header → Account Card → Quick Actions → Shopping Activity → Saved Data → Support → Settings → Diagnostics → Closed Alpha → Danger Zone
2. **Header:** Avatar, name (or styled email), mode badge, Closed Alpha badge, mode switch
3. **Account Card:** Active account, app version, sync status, build date
4. **Quick Actions:** Large tiles — Orders, Favorites, Cart, Wallet, Recent
5. **Shopping Activity:** Real counts from buyer home / cart / recent views — section hidden when no data
6. **Saved Data:** Recent views rail + favorite categories — hidden when empty
7. **Support:** Support, FAQ, report, policy, terms — web links via existing API base
8. **Settings:** Notifications/theme/language/biometrics disabled until APP-SHELL-1; diagnostics entry
9. **Diagnostics:** Build Info, Startup Diagnostics, Crash Report — navigates to existing screens
10. **Closed Alpha:** Version, update channel, update card when eligible
11. **Danger Zone:** Bottom sheet — clear cache, logout — no Alert dialogs
12. **Offline:** Last profile snapshot via `profile-cache.ts`
13. **Loading:** Shimmer skeleton, not spinner

## Implementation

| Module | Role |
|--------|------|
| `useProfileData.ts` | Load, cache, actions, telemetry |
| `ProfileExperience.tsx` | Personal account layout |
| `ProfileHeader` | Avatar, identity, mode, alpha badge |
| `ProfileAccountCard` | Account status card |
| `ProfileQuickActions` | Commerce shortcut tiles |
| `ProfileShoppingActivity` | Order/favorite/view stats |
| `ProfileSavedData` | Recent views + categories |
| `ProfileSupportSection` | Support links |
| `ProfileSettingsSection` | Settings rows |
| `ProfileDiagnosticsSection` | Diagnostics hub |
| `ProfileClosedAlphaCard` | Alpha channel + update |
| `ProfileDangerSheet` | Bottom sheet actions |
| `ProfileSkeleton` | Shimmer loading |

## POP metrics

| Event | Trigger |
|-------|---------|
| `profile_opened` | First tab open |
| `profile_edit` | Mode switch |
| `profile_logout` | Logout from danger sheet |
| `profile_support` | Open support |
| `profile_update` | Start APK update |
| `profile_cache_clear` | Clear local cache |
| `diagnostics_opened` | Open startup diagnostics |
| `build_info_opened` | Open build info |

## Marketplace audit

Post-Sprint scores: Marketplace **9.90** / Feeling **9.92** / Trust **9.96** / Profile UX **9.92**

Gate: `npm run product:epic-84:sprint8-profile`

## Physical checklist

See `artifacts/epic-84-sprint-8-profile/physical-checklist.md`

## Sprint gate

- Marketplace Score ≥ 9.90
- Marketplace Feeling ≥ 9.90
- Trust ≥ 9.95
- Profile UX ≥ 9.90
- Delta ≥ +2.0
- P0 = 0, P1 = 0, CRUD = PASS

## Post-Sprint note

After Sprint 8, stop new screen development. Run full Product Polish Audit before Seller Experience.
