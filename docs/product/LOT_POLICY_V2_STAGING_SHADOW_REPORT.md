# LOT Policy V2 — Staging Shadow Report

**EPIC:** 189.1  
**Mode:** SHADOW (no publication changes)  
**Generated:** 2026-08-26 (fixture validation; staging DB pending deploy)

---

## Summary

| Metric | Fixture shadow | Staging (pending) |
|--------|----------------|-------------------|
| Sample size | 121 text + 12 image fixtures | NOT_RUN (requires staging deploy + DATABASE_URL) |
| Agreement (fixtures) | 100% | — |
| OCR coverage | EVALUATED on pixel fixtures | — |
| Image coverage | QR + OCR-derived signals EVALUATED | — |
| Provider failures | 0 on fixtures | — |
| Critical false negatives | 0 | — |
| NOT_EVALUATED (pending pixel) | URL-only image hints without bytes | — |

---

## Automation verdict

**`NOT_READY_FOR_AUTOMATION`** — pixel OCR + QR/OCR-derived image signals operational on fixtures; **staging human comparison not yet run**.

`GUARDED_AUTO` and `ENFORCE` remain **disabled**.

---

## Next steps after staging deploy

1. Run `npm run moderation:policy-v2:shadow` against staging listings
2. Compare system recommendation vs human moderator decisions
3. Update this report with `artifacts/policy-v2-shadow/staging-shadow-report.json`

---

## RC10.5

**NOT_STARTED**
