# Marketplace Content Quality Intelligence

## Purpose

Content Quality Intelligence evaluates **quality and usefulness** of product card content — not just structural completeness (`photoCount`, `descriptionLength`).

```
Product → Content Quality Intelligence → Commercial Quality Score → Ranking Intelligence (advisory)
```

Live search (`resolveOrderBy()`) is **unchanged**.

## Feature flags

| Flag | Default | Effect |
|------|---------|--------|
| `MARKETPLACE_CONTENT_QUALITY_ENABLED` | off | Master switch |
| `MARKETPLACE_CONTENT_QUALITY_DAOS_ENABLED` | off | Use DAOS adapter when URL configured |
| `DAOS_QUALITY_API_URL` | — | External DAOS critics endpoint |

## Seller UI label

Use **«Качество карточки»** (0–100). Do not expose internal acronym «CQS» in UI.

## Separation of concerns

| Signal | Meaning |
|--------|---------|
| Качество карточки | Content quality |
| Рейтинг доверия | Seller trust |
| Оценка позиции | Ranking intelligence (advisory) |

Content quality does **not** include CTR, conversion, orders, or revenue.

## Module

`lib/marketplace-content-quality/`

## Verdict gate

This layer can be **READY FOR CONTENT QUALITY INTELLIGENCE** independently from **READY FOR LIVE RANKING**.
