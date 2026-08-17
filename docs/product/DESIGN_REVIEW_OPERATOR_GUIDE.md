# Design Review Operator Guide

Operator checklist for EPIC 87 physical screenshot workflow.

---

## Prerequisites

- Candidate APK installed on physical Android (or approved emulator for pilot)
- Test account credentials (no production PII)
- `adb` connected: `adb devices`

---

## Workflow

### 1. Install candidate APK

```bash
adb install -r lot-android-alpha-0.1.4.apk
```

Verify `versionName` matches release under review.

### 2. Open screen in prescribed state

| Screen | Prescribed state |
|--------|------------------|
| login | Logged out, empty fields |
| buyer_home | Logged in buyer, catalog loaded |
| catalog | Default category, ≥4 products |
| pdp | Product with image, price, CTA visible |
| cart | ≥1 item in cart |
| checkout | Ready to pay (test mode) |
| orders | ≥1 order or empty state (not error) |
| favorites | Default tab |
| profile | Buyer mode, account loaded |
| seller_home | Seller capable account |

### 3. Capture screenshot

```bash
export DESIGN_REVIEW_RELEASE=0.1.4-alpha
export DESIGN_REVIEW_SCREEN=login
export OPERATOR="your-name"
tsx scripts/design-review-capture-screenshot.ts
```

Or manually:

```bash
adb shell screencap -p /sdcard/screen.png
adb pull /sdcard/screen.png artifacts/design-review/0.1.4-alpha/login/screenshot.png
```

Create `metadata.json` alongside (see EPIC 87 doc).

### 4. Run review

```bash
npm run design:review -- --screen login
```

Inspect report: `artifacts/design-review/0.1.4-alpha/design-review-report.json`

### 5. Inspect issues

Each issue must have:

- severity
- evidence lines (file:line, measurements, screenshot facts)
- recommendation

Fix code → re-run review. Issue IDs remain stable for same root cause.

### 6. Human approve baseline

After visual review PASS (or accepted WATCH with no P0):

```typescript
import { saveBaselineApproval } from "@/lib/product-design-review/screenshot/intake";

saveBaselineApproval({
  screen: "login",
  release: "0.1.4-alpha",
  approvedAt: new Date().toISOString(),
  approvedBy: "operator-name",
  screenshotPath: "artifacts/design-review/0.1.4-alpha/login/screenshot.png",
  metadataPath: "artifacts/design-review/0.1.4-alpha/login/metadata.json",
  note: "Approved after P0=0 review on Pixel 6",
});
```

**No auto-approve.** Intentional visual changes require new approval.

### 7. Release gate

```bash
npm run product:design-gate
```

Must show `PR DESIGN GATE: READY` and `P0: 0` before RC.

---

## Privacy rules

- Use test accounts only
- Redact email/phone in screenshots when possible (`metadata.redacted: true`)
- Never commit auth tokens, cookies, or payment credentials
- Sanitize diagnostic exports before upload

---

## Device matrix (Phase 1)

Minimum:

- One primary physical Android baseline (1080×2400 class)
- Simulated dimensions for small/large — **do not claim multi-device PASS without evidence**

---

## Troubleshooting

| Problem | Action |
|---------|--------|
| `MISSING_PHYSICAL_EVIDENCE` | Capture PNG + metadata — do not mark PASS |
| High P0 on static only | Fix code issues first, then re-screenshot |
| Regression vs baseline | Review diff; if intentional, approve new baseline |
| Score below target but no P0 | **OK** — scores don't block; fix evidence issues only |

---

## Seller screens (EPIC 86)

Before Seller Sprint 1, validate:

- seller_home
- seller_product_card
- seller_kpi_card
- seller_priority_block

Apply **seller rubric** — revenue focus, action clarity, not buyer conversion heuristics.
