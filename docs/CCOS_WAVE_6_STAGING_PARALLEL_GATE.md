# Wave 6 Staging Parallel Gate

**Date:** 2026-08-16

## Status

| Step | Status |
|---|---|
| PR #83 merge to main | ⬜ Pending operator merge |
| Railway deploy `web-v2` | ⬜ Pending |
| `CCOS_EVOLUTION_PLATFORM_ENABLED=true` on staging | ⬜ Pending |
| `npx tsx scripts/ccos-wave-6-staging-acceptance.ts` | Ran locally |

## Local script result (against current staging URL)

```json
{
  "stagingSha": "eef7718",
  "gates": {
    "mobile_seller_home": false,
    "native_app_shell_start": "READY"
  },
  "verdicts": {
    "ccosWave6EvolutionEngine": "ACCEPTED"
  }
}
```

`mobile_seller_home: false` because staging has not deployed Wave 6 routes yet (still main @ eef7718).

## Mobile separation

Wave 6 fixes must not mix into APP-SHELL physical acceptance PR. Deploy order recommendation:

1. Merge + deploy Wave 6 (#83)
2. Merge + deploy APP-SHELL-0 (#84)
3. Run physical device acceptance against staging
4. Re-run Wave 6 staging acceptance with evolution flag enabled

## Command

```bash
CCOS_EVOLUTION_PLATFORM_ENABLED=true STAGING_BASE_URL=https://web-production-e56fb.up.railway.app \
  npx tsx scripts/ccos-wave-6-staging-acceptance.ts
```
