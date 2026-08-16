# CCOS Wave 6 Staging Acceptance

```bash
STAGING_BASE_URL=https://web-production-e56fb.up.railway.app \
  npx tsx scripts/ccos-wave-6-staging-acceptance.ts
```

Enable on staging for full HTTP evolution API checks:

```env
CCOS_EVOLUTION_PLATFORM_ENABLED=true
```

## Expected verdicts

```text
CCOS WAVE 6 EVOLUTION ENGINE: ACCEPTED
CANDIDATE → VALIDATION → APPROVAL → PROMOTION: PASS
ROLLBACK: PASS
LIVE RANKING: UNCHANGED
AUTOPILOT: DISABLED
LEARNING ENGINE: NOT ACTIVE
NATIVE APP SHELL START: READY
```
