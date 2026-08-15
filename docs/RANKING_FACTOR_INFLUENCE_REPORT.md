# Ranking Factor Influence Report

**Epic:** MARKETPLACE-INTEGRATION-VALIDATION-001  
**Dataset:** calibration-100-v1  
**Algorithm:** Ranking V1 Candidate  
**Generated:** 2026-08-15 via `npm run ranking:lab:100`

---

## Observed influence (100-product lab)

Values are **observed deltas** from controlled bump experiments, not pre-declared production weights.

| Factor | Observed influence | Confidence | Recommended V1 weight |
|--------|-------------------:|------------|----------------------:|
| Query relevance / SEO | 5–11 pts avg delta | Medium | 10% (keep) |
| CTR | 4–8 pts | Medium | 18% (keep, monitor) |
| Conversion | 3–7 pts | Medium | 7% (keep) |
| Product quality (photos) | 0–5 pts | Medium | 15% photos + 8% description |
| Seller Trust | 4–6 pts | Medium | 12% |
| Reviews | 2–4 pts | Low–Medium | 8% |
| Delivery / shipping | 2–4 pts | Medium | 5% |
| Price | 3–6 pts | Medium | 5% |
| Availability | gate-level | High | 5% + hard gate |
| Promotion | 0 if ineligible; ~5% of organic if eligible | High | cap 5% candidate |

Machine-readable: `artifacts/ranking-lab/factor-influence.json`

---

## Interaction effects noted

| Pair | Observation |
|------|-------------|
| SEO × CTR | Better titles increase effective CTR in synthetic matrix |
| Trust × Conversion | Low trust caps conversion score contribution |
| Photos × CTR | `<2 photos` triggers TOP block regardless of CTR |
| Promotion × Quality | Group D confirms **zero** boost when quality gate fails |
| Delivery × Trust | 4-day shipping proxy reduces seller shipping score |

---

## Promotion influence calibration

Tested candidate caps: `0%, 3%, 5%, 10%, 15%` of organic score.

**Recommendation for V1 advisory:** **5%** max promotion contribution on eligible products only.

Bad products with high promotion budget did **not** enter computed TOP-10 in lab runs.

---

## Reproducibility

- Seed: `20260815`
- Re-running `runFullCalibrationLab()` yields identical TOP product ordering.
- Full experiment log: `artifacts/ranking-lab/experiment-results.json`

---

## Disclaimer for sellers

Reports use language: «по текущей модели», «в тестовой симуляции» — no guaranteed position promises.
