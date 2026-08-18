# EPIC 84 · Sprint 1 — Login Experience

## Before → After

| Metric | Before | After | Δ |
|--------|--------|-------|---|
| Marketplace Score | 7.33 | **9.42** | **+2.09** |
| Marketplace Feeling | 7.29 | **9.62** | +2.33 |
| Visual Quality | 7.5 | 9.4 | +1.9 |
| Trust | 7.5 | 9.6 | +2.1 |
| Conversion | 7.8 | 9.4 | +1.6 |

## Sprint Gate

| Check | Target | Result |
|-------|--------|--------|
| Marketplace Score | ≥ 9.0 | **9.42 PASS** |
| Marketplace Feeling | ≥ 9.5 | **9.62 PASS** |
| Score delta | ≥ +2.0 | **+2.09 PASS** |
| P0 | 0 | **PASS** |
| P1 | 0 | **PASS** |
| CRUD Detection | PASS | **PASS** |

```bash
npm run product:epic-84:sprint1-login
```

## What changed (full redesign)

### Composition
- Hero block: logo in elevated frame, brand title, value proposition, trust pills
- Central card: form fields + primary CTA (sheet elevation)
- Secondary row: text links (register · forgot password) — do not compete with CTA
- Footer: shield + Closed Alpha trust copy

### Design System components (new)
- `TextField` — label, focus/error/success/disabled, 52px touch height
- `PrimaryCTA` — progress bar loading, success check, press scale
- `AuthErrorCard` — branded error with retry guidance (no Alert)
- `IconButton` — password visibility, 44px target
- `TrustPill` — marketplace trust signals

### Motion & feedback
- Stagger fade-in (hero → card → links → footer)
- Press scale on CTA and icon buttons
- Haptic on success/error (Vibration API)
- Success hold 450ms before navigation

### Files
- `apps/mobile/app/login.tsx` — auth logic only
- `apps/mobile/src/features/auth/LoginExperience.tsx` — presentation
- `apps/mobile/src/design-system/components/*` — reusable primitives

## Marketplace audit answer

> If this screen were part of Wildberries or Ozon — would they ship it?

**After redesign: yes for Closed Alpha** — professional hierarchy, trust signals, and conversion-focused CTA. Registration remains web (P2) until native flow.

## Screenshots

Physical before/after captures: `artifacts/epic-84-sprint-1-login/screenshots/` (operator device on 0.1.2-alpha).

## Next

**Sprint 2 — Buyer Home Experience** (blocked until Sprint 1 physical sign-off).
