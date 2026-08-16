# Mobile Roadmap — Alpha Track

> Platform built (EPIC 77–83) → **Product built (EPIC 84)**

## Active EPIC

**EPIC 84 — Marketplace Productization Platform (MPP) · Phase 0**

Focus: user value, buyer/seller journeys, marketplace feel, trust, conversion, retention — **no new platforms**.

**Wave 0 (active):** UX Product Audit — score every screen, file P0/P1/P2.

**Not in scope:** Brain, Graph, Twin, APP-SHELL-1, new infra EPICs.

## Hard product rule (post-first-APK)

```text
P0 > 0  OR  P1 > 3  →  no new large functional EPIC
```

Documented in root `AGENTS.md`.

## Release timeline

| Version | versionCode | Status | Notes |
|---------|-------------|--------|-------|
| 0.1.0-alpha | 1 | Unsupported | Prototype |
| 0.1.1-alpha | 2 | Unsupported | Transitional |
| **0.1.2-alpha** | **3** | **Published — first supported** | EPIC 83 baseline |
| 0.1.3-alpha | 4 | Planned | First seamless update E2E |

## Gate scripts

```bash
npm run mobile:epic-83:gate          # minimum supported version
npm run product:epic-84:gate         # POP release verdict + Wave 0 docs
npm run mobile:release-gate
npm run mobile:closed-alpha:gate
```

## Physical acceptance

- `docs/mobile/EPIC_81_PHYSICAL_ACCEPTANCE_CHECKLIST.md` — B1–R4
- `docs/product/EPIC_84_WAVE_0_UX_AUDIT.md` — screen audit matrix (Wave 0)

## APP-SHELL-1

**BLOCKED** until EPIC 84 Wave 8 (Open Alpha readiness): physical PASS, P0=0, seamless update PASS, POP verdict GO.

## Completed EPICs

- EPIC 78 — Mobile Release Platform (MRP)
- EPIC 79 — Product Operations Platform (POP)
- EPIC 80 — Closed Alpha Launch Gate
- EPIC 81 — APP-SHELL-0.5 Mobile UX (Wave 1 + 2)
- EPIC 82 — Closed Alpha Stabilization & Seamless Updates
- EPIC 83 — Minimum Supported Version + Alpha Baseline (`0.1.2-alpha`)

## Productization docs

- `docs/product/EPIC_84_MARKETPLACE_PRODUCTIZATION.md` — mission, waves, deliverables
- `docs/product/EPIC_84_WAVE_0_UX_AUDIT.md` — screen scoring template
