# EPIC 88 — Permanent Mobile Release Checklist

> **Purpose:** Every Closed Alpha (and future production) mobile release MUST pass this checklist before publish.  
> **Baseline:** Closed Alpha `0.1.5-alpha` token-fix  
> **Automated runner:** `npm run mobile:epic-88:gate`  
> **Owner:** Mobile release platform (MRP)

---

## Release lifecycle (mandatory)

```text
build → typecheck → test → dependency gates → route/token gates →
clean APK build → metadata → bytecode → FTL → release validation →
MRP publish → GitHub Release → adoption telemetry
```

See also: `docs/mobile/EPIC_83_MINIMUM_SUPPORTED_VERSION.md`, `AGENTS.md`.

---

## Gate matrix

| # | Gate | Command | Blocking | Artifact |
|---|------|---------|----------|----------|
| 1 | **Typecheck** | `npm run mobile:typecheck` | ✅ | — |
| 2 | **Tests** | `npm run mobile:test` | ✅ | — |
| 3 | **Dependency gate** | `npm run mobile:p0:expo-deps-gate` | ✅ | `artifacts/epic-84-p0-startup/expo-deps-gate-report.json` |
| 4 | **Route graph gate** | `npm run mobile:p0:route-graph-gate` | ✅ | route-graph probe report |
| 5 | **Token architecture gate** | `npm run mobile:p0:token-architecture-guard` | ✅ | token architecture report |
| 6 | **Cycle gate** | `npm run mobile:p0:token-cycle-gate` | ✅ | madge 0 cycles through `theme/tokens.ts` |
| 7 | **Startup gate** | `npm run product:epic-84:p0-startup` | ✅ | `artifacts/epic-84-p0-startup/gate-report.json` |
| 8 | **Bytecode guard** | `npm run mobile:p0:bytecode-guard` | ✅ | `bytecode-guard-report.json` |
| 9 | **Performance gate** | Manual + `npm run mobile:release-smoke` | ⚠️ WATCH | bundle export smoke |
| 10 | **Accessibility gate** | Physical checklist §A11Y | ⚠️ WATCH | screenshot evidence |
| 11 | **Design gate** | `npm run product:epic-84:wave0` | ⚠️ WATCH | marketplace quality audit |
| 12 | **Closed Alpha gate** | `npm run mobile:closed-alpha:gate` | ✅ | EPIC 80 verdict |
| 13 | **Minimum supported gate** | `npm run mobile:epic-83:gate` | ✅ | EPIC 83 verdict |
| 14 | **APK metadata gate** | `npm run mobile:p0:apk-metadata-gate` | ✅ | `apk-metadata-gate-report.json` |
| 15 | **Firebase Test Lab** | `npm run mobile:p0:firebase-test-lab` | ✅ | `firebase-test-lab-report.json` |
| 16 | **Release validation** | Version-specific publish script | ✅ | release validation report |
| 17 | **APK validation** | SHA256 verify + download test | ✅ | operator report |

**Blocking (✅):** Publish blocked on FAIL.  
**Watch (⚠️):** Publish allowed with documented WATCH verdict and operator sign-off.

---

## 1. Typecheck

```bash
npm run mobile:typecheck
```

- Zero TypeScript errors in `apps/mobile`
- Required before any APK build

---

## 2. Tests

```bash
npm run mobile:test
```

- All unit tests in `apps/mobile` pass
- Add regression tests when fixing P0/P1 debt items

---

## 3. Dependency gate

```bash
npm run mobile:p0:expo-deps-gate
```

Validates:
- Expo SDK ↔ React Native version compatibility
- No forbidden native module combinations
- Clipboard/provider P0 regressions blocked

---

## 4. Route graph gate

```bash
npm run mobile:p0:route-graph-gate
```

Validates:
- Expo Router route modules load without `undefined` exports
- Probes `ErrorBoundary`, layout, and tab routes
- Prevents P0 route-graph crash (`colors of undefined`)

---

## 5. Token architecture gate

```bash
npm run mobile:p0:token-architecture-guard
```

Validates:
- `theme/tokens.ts` imports ONLY from `design-system/tokens/*`
- Never imports `design-system/index` or component barrels
- Public token API unchanged

---

## 6. Cycle gate

```bash
npm run mobile:p0:token-cycle-gate
```

Validates:
- Madge reports **0 circular dependencies** through `theme/tokens.ts`
- Full `src/` cycle scan recommended (currently 0)

---

## 7. Startup gate

```bash
npm run product:epic-84:p0-startup
```

Validates:
- Boot pipeline stages complete in probe
- No fatal errors before `ROOT_LAYOUT_INIT`
- **Do not modify startup code** unless compatibility fix required

Physical FTL evidence required for publish (see §15).

---

## 8. Bytecode guard

```bash
npm run mobile:p0:bytecode-guard
```

Validates release APK/Hermes bytecode integrity after clean build.

---

## 9. Performance gate

### Automated smoke

```bash
npm run mobile:release-smoke
```

Runs `npx expo export --platform android` — catches bundle resolution failures.

### Manual checks (document in release report)

| Check | Pass criteria |
|-------|---------------|
| Buyer home first paint | Skeletons visible < 300ms; no white flash |
| Catalog scroll | 60fps feel on mid-range device; no jank on fast scroll |
| Tab switch | No visible stall > 500ms (badge fetch acceptable with WATCH) |
| PDP open | Skeleton → content transition smooth |
| Cart/checkout | No layout jump on sticky CTA |
| Memory | No OOM after 10 min buyer walkthrough |

**EPIC 88 targets:** FlashList migration, tab badge throttle, N+1 elimination — track as WATCH until fixed.

---

## 10. Accessibility gate

Use `docs/mobile/EPIC_81_PHYSICAL_ACCEPTANCE_CHECKLIST.md` plus:

| # | Check | Pass |
|---|-------|------|
| A1 | TalkBack: Login → Home → Catalog → PDP → Cart | ☐ |
| A2 | All primary buttons have spoken labels | ☐ |
| A3 | Product cards announce title + price | ☐ |
| A4 | System font scale 130%: no clipped prices/CTAs | ☐ |
| A5 | Contrast: body text readable on all backgrounds | ☐ |
| A6 | Touch targets ≥ 44dp on primary actions | ☐ |

Document `NOT_RUN` honestly in cloud; operator must complete on physical device.

---

## 11. Design gate

```bash
npm run product:epic-84:wave0
```

Validates:
- Design system registry coverage
- No CRUD-level patterns (`Alert.alert`, «Нет данных»)
- Marketplace Quality Index within acceptable range

Reference: `docs/product/EPIC_84_WAVE_0_DESIGN_SYSTEM.md`

---

## 12. Closed Alpha gate

```bash
npm run mobile:closed-alpha:gate
```

Validates EPIC 80 launch readiness: channel safety, distribution, cohort checklist.

---

## 13. Minimum supported version gate

```bash
npm run mobile:epic-83:gate
```

Validates:
- `minimumSupportedVersionCode` enforced
- Unsupported clients blocked with upgrade prompt
- Release lifecycle: build → publish → MRP → adoption

---

## 14. APK metadata gate

```bash
npm run mobile:p0:apk-metadata-gate
```

Validates:
- `versionName` / `versionCode` match release manifest
- Package name `com.lot.marketplace`
- Signing config present

---

## 15. Firebase Test Lab

```bash
npm run mobile:p0:firebase-test-lab
```

**Required device:** Pixel 5 / API 30 / en_US / portrait  
**Required test:** Robo  
**Pass criteria:** `ROOT_LAYOUT_INIT` → `BOOT_PIPELINE_INIT` → UI render (no crash at `ROUTER_ENTRY`)

Cloud agents: often `NOT_RUN` — operator must run with gcloud credentials.

---

## 16. Release validation

Run version-specific publish script after all gates pass:

```bash
# Example for 0.1.5-alpha
npm run mobile:closed-alpha:publish-015
```

Validates:
- MRP manifest sync
- GitHub Release asset upload
- Canonical SHA256 recorded in `lib/mobile-release-platform/constants.ts`

---

## 17. APK validation

Operator checklist:

| Step | Action |
|------|--------|
| V1 | Download APK from GitHub Release URL |
| V2 | Verify SHA256 matches manifest |
| V3 | Install on physical Android (API 30+) |
| V4 | Cold start → login → buyer home (no crash) |
| V5 | Verify `versionName` in Profile → Build info |
| V6 | Seamless update path works from previous alpha |

Document in `docs/incidents/MOBILE-P0-RELEASE-VALIDATION-*-*.md`.

---

## Full pipeline (0.1.5+ pattern)

```bash
npm run mobile:p0:release-gate-015
```

Runs: dependency → startup → clean build → metadata → bytecode → FTL (when available).

For future versions, clone `scripts/mobile-p0-release-gate-015.ts` pattern with updated version constants.

---

## EPIC 88 composite gate

```bash
npm run mobile:epic-88:gate
```

Runs all automatable checklist items and writes:

```
artifacts/epic-88/release-checklist-report.json
```

---

## Verdict matrix

| Verdict | Meaning | Publish |
|---------|---------|---------|
| **GO** | All blocking gates PASS; FTL PASS; physical WATCH items documented | ✅ |
| **WATCH** | Blocking PASS; FTL PASS; performance/a11y/design gaps documented | ⚠️ With sign-off |
| **NO-GO** | Any blocking gate FAIL or FTL FAIL | ❌ |

---

## Release report template

Every publish MUST produce:

1. Gate report JSON (`artifacts/epic-88/release-checklist-report.json`)
2. APK SHA256 + download URL
3. FTL status (PASS / FAIL / NOT_RUN)
4. Physical acceptance status (PASS / NOT_RUN)
5. Known WATCH items from EPIC 88 backlog

---

## Related documents

| Document | Purpose |
|----------|---------|
| `docs/product/EPIC_88_COMMERCE_FOUNDATION_HARDENING.md` | Full audit (Parts 1–7) |
| `docs/product/EPIC_88_TECHNICAL_DEBT_BACKLOG.md` | Prioritized debt |
| `docs/mobile/EPIC_81_PHYSICAL_ACCEPTANCE_CHECKLIST.md` | Physical buyer/seller walkthrough |
| `docs/mobile/CLOSED_ALPHA_GO_NOGO.md` | Alpha go/no-go policy |
| `docs/incidents/MOBILE-P0-RELEASE-VALIDATION-015-TOKEN-FIX.md` | 0.1.5 validation example |
