# EPIC-77-PRE-WAVE-6-FINAL-GATE-002 — Acceptance

Rollback foundation + mobile refresh auth + app shell readiness freeze.

## Scope

No new cognitive functionality. No Wave 6. Live ranking unchanged. Autopilot disabled.

## Local verification (branch `cursor/epic-77-pre-wave-6-final-gate-d03e`)

| Gate | Result |
|---|---|
| Graph previous verified version | PASS |
| Brain previous verified version | PASS |
| Knowledge previous version | PASS |
| Graph rollback | PASS |
| Brain rollback | PASS |
| Knowledge pack rollback | PASS |
| Rollback audit | PASS |
| Human approval required | PASS |
| rollbackAvailable | PASS |
| Evolution readiness (local) | READY |
| Mobile login | PASS |
| Mobile refresh | PASS |
| Refresh rotation | PASS |
| Replay protection | PASS |
| Logout | PASS |
| Multi-device | PASS |
| Web auth regression | PASS (NextAuth unchanged) |
| Mobile API v1 frozen | PASS (`mobileApiVersion = 1`) |
| Deep links | PASS |
| Offline resume foundation | PASS |
| Android update contract | PASS |
| App shell readiness (local) | YES |

## Tests

```bash
npm test -- --run \
  tests/ccos-rollback-foundation.test.ts \
  tests/ccos-rollback-governance.test.ts \
  tests/evolution-readiness-final.test.ts \
  tests/mobile-refresh.test.ts \
  tests/mobile-refresh-replay.test.ts \
  tests/mobile-multi-device-session.test.ts \
  tests/mobile-logout.test.ts \
  tests/mobile-shell-readiness.test.ts \
  tests/mobile-startup-flow.test.ts
```

## Staging verification

After merge to `main` and Railway deploy:

```bash
STAGING_BASE_URL=https://web-production-e56fb.up.railway.app \
  npx tsx scripts/ccos-full-stack-staging-acceptance.ts
```

Hard checks on deployed stack:

- `GET /api/admin/ccos/evolution-readiness` → `rollbackAvailable: true`, `ready: true`
- `GET /api/mobile/readiness` → `appShellReadiness: "YES"`
- `POST /api/mobile/auth/refresh` → 200 (not 501)
- `POST /api/mobile/auth/logout` → 200 (not 501)

Migration required on staging:

```bash
npx prisma migrate deploy
```

## Final verdicts (post-staging)

| Verdict | Expected |
|---|---|
| ROLLBACK FOUNDATION | ACCEPTED |
| EVOLUTION ENGINE READINESS | READY |
| MOBILE AUTH | ACCEPTED |
| APP RELEASE READINESS | full score |
| APP_SHELL_READY | YES |
| LIVE RANKING | UNCHANGED |
| AUTOPILOT | DISABLED |

## Wave 6 gate

Only when **all** of:

```text
rollbackAvailable = true
EVOLUTION ENGINE READINESS = READY
Mobile refresh = PASS
APP_SHELL_READY = YES
```

→ EPIC-77-WAVE-6 Cognitive Evolution Engine may start.

## Related

- `docs/ANDROID_RELEASE_SIGNING.md`
- `docs/MOBILE_AUTH_DECISION.md`
- `docs/MOBILE_APP_SHELL_READINESS.md`
- `docs/CCOS_EVOLUTION_FINAL_READINESS.md`
- `lib/ccos/rollback/`
- `lib/mobile/auth/`
