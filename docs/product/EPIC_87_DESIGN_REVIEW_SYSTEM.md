# EPIC 87 — Design Review & Visual Quality System

> **Philosophy:** не ещё один субъективный score `9.97/10`. Ценность — в **конкретном evidence**: «CTA слишком мал», «touch target 36dp», «регресс vs approved screenshot».

---

## Mission

Обязательная система проверки качества мобильного интерфейса ЛОТ:

```text
Design → Implementation → Screenshot → Automated Review → Concrete Issues → Fix → Re-review → Release Gate
```

Каждый FAIL обязан иметь:

- конкретную причину
- экран
- компонент (если применимо)
- severity (P0 / P1 / P2 / INFO)
- evidence
- recommendation

**Scores = advisory.** Issues + evidence = source of truth.

---

## Architecture

```text
lib/product-design-review/
├── types.ts                 # DesignReviewIssue, DesignReviewResult contracts
├── review/                  # orchestrator, fix-loop, versioning
├── rules/                   # severity, gate-policy (hard blockers)
├── evidence/                # confidence (LOW/MEDIUM/HIGHER)
├── scoring/                 # advisory scores (non-blocking)
├── screens/                 # buyer baseline + seller readiness registry
├── static/                  # design-system AST/source audit
├── crud/                    # CRUD Detection v2
├── commerce/                # commerce + attention hierarchy heuristics
├── conversion/              # CTA competition, friction
├── trust/                   # fabricated signals, raw IDs
├── accessibility/           # labels, touch targets, contrast heuristics
├── navigation/              # dead CTAs, unavailable routes
├── states/                  # loading / empty / error consistency
├── performance/             # static perf heuristics (+ runtime contract)
├── screenshot/              # intake, metadata, visual provider interface
├── regression/              # baseline compare (pixel diff = evidence)
└── report/                  # report builder, release comparison
```

Provider-independent — **не связан с React Native** напрямую.

---

## Review Contract

```typescript
type DesignReviewIssue = {
  id: string;              // stable hash across reruns
  screen: string;
  category: "visual" | "hierarchy" | "commerce" | "conversion" | "trust" |
            "accessibility" | "consistency" | "motion" | "loading" | "error" | "performance";
  severity: "P0" | "P1" | "P2" | "INFO";
  title: string;
  component?: string;
  evidence: string[];
  recommendation: string;
  source: "static" | "screenshot" | "runtime" | "baseline";
};
```

---

## Score Policy (mandatory)

**Не блокировать PR** только потому что `Marketplace Score = 9.42` при target `9.50`.

Hard blockers:

| Blocker | Trigger |
|---------|---------|
| P0 > 0 | Any P0 issue with evidence |
| Accessibility critical | Icon-only without labels, etc. |
| Broken navigation | Unavailable destination |
| Missing critical CTA | Commerce screen without primary action |
| Visual regression critical | Approved baseline regression (evidence) |
| CRUD critical | Admin table / raw API dump patterns |

---

## False Confidence Guard

| Analysis mode | Confidence |
|---------------|------------|
| Static/code only | LOW / MEDIUM |
| + physical screenshot | HIGHER |

Запрещено: `Marketplace Feel: 9.97` без physical screenshot evidence.

---

## Screenshot Artifact Convention

```text
artifacts/design-review/<release>/<screen>/
├── screenshot.png
└── metadata.json
```

Metadata:

```json
{
  "screen": "catalog",
  "appVersion": "0.1.4-alpha",
  "build": "...",
  "device": "Pixel 6",
  "android": "14",
  "width": 1080,
  "height": 2400,
  "theme": "light"
}
```

Screens without PNG → `MISSING_PHYSICAL_EVIDENCE` (not fake PASS).

---

## Buyer Baseline Pack

Login · Buyer Home · Catalog · PDP · Cart · Checkout · Orders · Favorites · Profile

## Seller Readiness (EPIC 86 Sprint 1 gate)

Seller Home · Seller Product Card · Seller KPI Card · Seller Priority Block

Seller Sprint 1 **UNBLOCKED** only when design review system validates seller screens with physical evidence + ≥1 approved baseline.

---

## CLI & Gates

```bash
npm run design:review                    # all screens
npm run design:review -- --screen catalog
npm run product:design-gate              # PR design gate
npm run product:epic-87:design-review    # EPIC acceptance gate
```

Capture screenshot (physical device / emulator):

```bash
tsx scripts/design-review-capture-screenshot.ts
```

---

## API

`GET /api/admin/product-ops/design-quality`

Query params: `release`, `compare`, `refresh=1`

---

## Admin UI

`/admin/operations` → **Design Quality** panel (EPIC 87)

Shows per-screen PASS/WATCH/FAIL, P0/P1/P2, baseline coverage, Seller Sprint 1 status.

---

## Visual Regression Workflow

```text
Candidate → Review → Human Approve Baseline → New Baseline
```

- Pixel diff = **evidence**, not automatic verdict
- No auto-approve

---

## Human Approval (Release Candidate)

Final Design PASS requires:

```text
Automated Review + Physical Screenshot + Human Approval
```

---

## Final Verdicts

| Verdict | Values |
|---------|--------|
| DESIGN REVIEW CORE | READY / NOT READY |
| STATIC REVIEW | PASS / FAIL |
| SCREENSHOT REVIEW | PASS / PARTIAL / FAIL |
| VISUAL REGRESSION | PASS / PARTIAL / FAIL |
| ACCESSIBILITY GATE | PASS / FAIL |
| PHYSICAL BASELINE COVERAGE | N / TOTAL |
| PR DESIGN GATE | READY / NOT READY |
| SELLER EXPERIENCE SPRINT 1 | UNBLOCKED / BLOCKED |

---

## EPIC 87 Hard Gate

EPIC 87 не принят, пока минимум один physical screen не прошёл:

```text
Screenshot → Review → Issues → Human approval → Approved baseline
```

После этого разрешён **EPIC 86 Sprint 1: Seller Home**.

---

## Security / Privacy

- Test accounts only in screenshots
- Redact email/phone
- No tokens or payment credentials in artifacts

See `docs/product/DESIGN_REVIEW_OPERATOR_GUIDE.md` for operator checklist.
