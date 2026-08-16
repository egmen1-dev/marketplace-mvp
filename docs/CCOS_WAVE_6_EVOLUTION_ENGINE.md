# CCOS Wave 6 Evolution Engine

## Purpose

Safe release management for Brain / Knowledge / Graph policies.

**Not:** Learning Engine, autopilot, live ranking changes.

## Pipeline

```text
Current Brain → Candidate → Structural → Regression → Graph → Twin → Shadow → Risk → Human Approval → Promotion → Monitoring → Rollback
```

## Module

`lib/ccos/evolution/`

## Feature flag

```env
CCOS_EVOLUTION_PLATFORM_ENABLED=false
```

When OFF: current Brain unchanged, no candidate UI mutation.

## Admin

- UI: `/admin/ccos/evolution`
- APIs: `/api/admin/ccos/evolution/*`

## Mobile (Wave 6 app-release bricks)

- `bootstrap.cognitiveCapabilities`
- `GET /api/mobile/seller/home`
- `GET /api/mobile/buyer/home`
- Error + pagination contract v1

Native App Shell 0 is a **separate epic** — not in this PR.
