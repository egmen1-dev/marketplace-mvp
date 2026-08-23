# EPIC — Commerce-First UX + Persistent Session + Network Resilience + Product Reviews

## LOT COMMERCE-FIRST PRINCIPLE

LOT optimizes for movement of goods toward transactions.

Primary surfaces should prioritize:

DISCOVERY → INTENT → PRODUCT → TRUST → TRANSACTION

Secondary systems (profile, wallet, settings, analytics) support commerce rather than replace it as the primary application experience.

## Audit matrix (summary)

| Area | Current implementation | Problem | Reuse | Required change |
|---|---|---|---|---|
| Session | SecureStore tokens + meta | Refresh wiped meta; flat errors not parsed | secure-session, refresh API | Fix refresh contract + meta merge |
| Boot | Sequential health/bootstrap fatal | DNS failure blocks app for authed users | boot diagnostics | Retry + degraded startup |
| Reviews | Prisma Review + trust-loop | No mobile REST API | getProductRatingSnapshot, listApproved | Mobile reviews route + batch ratings on catalog |
| Navigation | Dual buyer/seller tab shells | Artificial role switching | Expo tabs | Unified 5-tab IA |
| Home | Buyer-only discovery feed | Duplicate sections, seller split | fetchCatalog | Commerce-first unified home |

## Physical Android validation checklist

1. Install/update APK.
2. Login.
3. Close app completely.
4. Reopen — verify no login requested.
5. Enable airplane mode.
6. Reopen — verify session not destroyed.
7. Restore network — verify recovery banner clears.
8. Open Home — products visible with ratings when available.
9. Open PDP — reviews section renders.
10. Scroll reviews — load more without duplicates.
11. Use Sell tab / Profile seller tools without role switcher.
12. Open orders — buyer copy correct.
13. Restart again — session remains valid.
