# LOT_POLICY_V2 Architecture

**Version:** `LOT_POLICY_V2`  
**Effective from:** 2026-08-26  
**Registry:** `config/policies/lot-policy-v2.json`

---

## Decision classes

| Class | Meaning | Seller UX |
|-------|---------|-----------|
| `ALLOW` | Permitted | Normal publish flow |
| `HARD_BLOCK` | Must not publish | «Этот ЛОТ нельзя опубликовать» + human-readable reason |
| `RESTRICTED_REVIEW` | Potentially allowed with docs / license / age gate | Queue for moderator |
| `MANUAL_REVIEW` | Insufficient or ambiguous evidence | Queue for moderator |
| `NOT_EVALUATED` | Required safety dimension not checked | Queue — **NOT_EVALUATED ≠ SAFE** |

Precedence: `HARD_BLOCK` → `RESTRICTED_REVIEW` → `MANUAL_REVIEW` (conflicts) → `NOT_EVALUATED` → `ALLOW`.

---

## Pipeline

```text
Input (title, description, category, productType, characteristics, images, seller, price)
  ├─ Category / ProductType guard ──► HARD_BLOCK before submit (blocked categories)
  ├─ Text engine (title + description) ──► pattern groups + accessory / toy / alcohol-free context
  ├─ Characteristics engine ──► nicotine concentration, required safety fields
  ├─ Image heuristic engine ──► URL/alt contact + QR signals
  ├─ OCR heuristic engine ──► alt/URL text fed back into text patterns
  └─ Evidence fusion ──► conflicts, precedence, final decision + audit evidence[]
```

### Code layout

| Module | Path |
|--------|------|
| Types | `lib/moderation/policy-v2/types.ts` |
| Registry loader | `lib/moderation/policy-v2/load-registry.ts` |
| Evaluator | `lib/moderation/policy-v2/evaluate.ts` |
| Text engine | `lib/moderation/policy-v2/text-engine.ts` |
| Category guard | `lib/moderation/policy-v2/category-guard.ts` |
| Characteristics | `lib/moderation/policy-v2/characteristics-engine.ts` |
| Image/OCR heuristic | `lib/moderation/policy-v2/image-ocr-engine.ts` |
| Fusion | `lib/moderation/policy-v2/evidence-fusion.ts` |
| Safe auto-approval | `lib/moderation/policy-v2/safe-auto-approval.ts` |

---

## Evidence model

Each hit records:

- `source`: `TITLE_SIGNAL` | `DESCRIPTION_SIGNAL` | `CATEGORY_SIGNAL` | `CHARACTERISTIC_SIGNAL` | `OCR_SIGNAL` | `IMAGE_SIGNAL` | …
- `policyId`, `confidence`, `matchedValue`, `engineVersion`, `evaluatedAt`

Conflicts (example): description «без никотина» + OCR «nicotine 20mg/ml» → `MANUAL_REVIEW`, never silent ALLOW.

---

## Automation levels

| Mode | Behavior |
|------|----------|
| `SHADOW` | V2 recommendation attached; V1 publication outcome unchanged (**current default**) |
| `GUARDED_AUTO` | Auto-approve only full `ALLOW` with all critical dimensions evaluated |
| `ENFORCE` | Full automatic enforcement (not enabled) |

Env vars:

- `MODERATION_AUTOMATION_MODE` — `OFF` | `SHADOW` | `GUARDED_AUTO` | `ENFORCE`
- `LOT_POLICY_V2_SHADOW` — set `false` to disable V2 shadow attachment (default: enabled)

Safe auto-approval contract (`canAutoApprove`):

- category policy = ALLOW
- all text/characteristics evaluated
- image + OCR evaluated where applicable (pixel engines)
- no conflicts, no restricted signals, no critical `NOT_EVALUATED`

---

## Image / OCR status

| Capability | Status | Provider |
|------------|--------|----------|
| Image classification (weapons, adult, …) | **NOT_AVAILABLE** | Pixel CV provider not wired |
| OCR (composition, nicotine, contacts) | **HEURISTIC** | Alt text + URL path only |
| Contact/QR in URL | **HEURISTIC** | `LOT_POLICY_V2_IMAGE_HEURISTIC/1.0.0` |

Listings with images but no pixel engines → `NOT_EVALUATED` for image dimensions when text signals are insufficient.

---

## Admin moderation UX (data model)

`PolicyEvaluationResult` on `ModerationResult.policyV2` (shadow) includes:

- `decisionClass`, `rulesTriggered`, `evidence[]`, `conflicts[]`, `notEvaluatedDimensions[]`
- `userMessage` (seller-facing), `adminSummary`
- `blockBeforeSubmit` for confident `HARD_BLOCK`

Moderator view should show recommendation, signals, OCR, conflicts, and legal/platform `policyId` reference — not raw codes like `POLICY_19_TOBACCO_REMOTE_SALE`.

---

## SLA / priority (proposal)

| Factor | Priority boost |
|--------|----------------|
| `HARD_BLOCK` / critical severity | Highest |
| Restricted category | High |
| Evidence conflicts | High |
| Ambiguous (`MANUAL_REVIEW`) | Medium |
| Low-risk ALLOW shadow match | Normal |

---

## Versioning

- Registry `effectiveFrom` / `deprecatedAt` in JSON
- `policyVersion` stored on each evaluation
- High-risk policy changes require re-evaluation of approved LOTs (architecture only — batch job deferred)

---

## Testing

```bash
npm run moderation:policy-v2:gate
npm test -- tests/moderation-policy-v2.test.ts
npm run moderation:policy-v2:shadow
```

Fixtures: `tests/fixtures/policy-v2/fixtures.json` (121 cases).

---

## Integration

`runLotModerationEngine` attaches `policyV2` when `LOT_POLICY_V2_SHADOW` is enabled. V1 decision path unchanged until promotion gate passes.

**RC10.5 / physical beta:** BLOCKED until this EPIC validation completes.
