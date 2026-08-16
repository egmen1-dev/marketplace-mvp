# Mobile Roadmap — Alpha Track

> Stabilize → Polish → Update → Observe → Closed Alpha

## Active EPIC

**EPIC 82 — Closed Alpha Stabilization & Seamless Updates**

Focus: stability, UX polish, physical Android acceptance, seamless APK updates (`0.1.0 → 0.1.1`), cohort prep (5–10 testers).

**Not in scope:** Push, Camera Product Creation, Biometrics, APP-SHELL-1, new CCOS Waves.

## Hard product rule (post-first-APK)

```text
P0 > 0  OR  P1 > 3  →  no new large functional EPIC
```

Documented in root `AGENTS.md`.

## Release timeline

| Version | versionCode | Status | Notes |
|---------|-------------|--------|-------|
| 0.1.0-alpha | 1 | Published | APP-SHELL-0 foundation |
| 0.1.1-alpha | 2 | Target (EPIC 82) | Wave 2 UX + seamless updates |

## Gate scripts

```bash
npm run mobile:release-gate
npm run mobile:closed-alpha:gate
npm run mobile:closed-alpha:publish-011
npm run mobile:epic-82:gate
```

## Physical acceptance

- `docs/mobile/EPIC_81_PHYSICAL_ACCEPTANCE_CHECKLIST.md` — B1–R4
- `docs/mobile/EPIC_82_CLOSED_ALPHA_STABILIZATION.md` — EPIC 82 matrix + update E2E

## APP-SHELL-1

**BLOCKED** until EPIC 82 hard gate passes (physical PASS, P0=0, seamless update PASS, cohort WATCH+).

## Completed EPICs

- EPIC 78 — Mobile Release Platform (MRP)
- EPIC 79 — Product Operations Platform (POP)
- EPIC 80 — Closed Alpha Launch Gate
- EPIC 81 — APP-SHELL-0.5 Mobile UX (Wave 1 + 2)
