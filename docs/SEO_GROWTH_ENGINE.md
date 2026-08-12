# SEO Growth Engine — EPIC-A-006

## Architecture

```
Catalog Core / Brand / Facets
  → SEO Entity Layer (templates, score, JSON-LD, linking)
  → Landing Pages (Category / ProductType / Brand / controlled Facet)
  → Sitemap + robots
  → Search engines
```

## Pages

| Entity | Path | Index rule |
|--------|------|------------|
| Category | `/category/[slug]` | score ≥ 45 and products &gt; 0 |
| ProductType | `/catalog/{categoryPath}/{typeSlug}` | score gate |
| Brand | `/brands/[slug]` | score gate |
| Brands index | `/brands` | always |
| Facet | `/catalog/seo/{type}/{value}` | **only** `SeoPage` APPROVED + indexable |
| Product | `/product/[id]` | uses `seoTitle`/`seoDescription` when set |

## Templates

`lib/seo/templates.ts` — `{Category}`, `{ProductType}`, `{Brand}`, `{AppName}`, …

## AI SEO

`lib/seo/ai-draft.ts` (rules-v1, A-004 compatible):

Draft → `SeoPage.aiDraft` → admin Approve → publish fields. **Never auto-index AI text.**

## Quality score

`computeSeoScore` 0–100. Threshold `SEO_INDEX_THRESHOLD = 45`. Empty inventory → noindex.

## Internal linking

`SeoRelatedLinks` + `buildRelatedLinks` (category ↔ types ↔ brands ↔ products).

## Sitemap

Categories, ProductTypes (with products), brands, approved SeoPages, products. Excludes empty / low-score facet pages.

## Structured data

CollectionPage, ItemList, Product, Organization (brand), BreadcrumbList.

## Admin

`/admin/seo` — drafts, approve, disable indexing, opportunity list.

## Scaling

- Do not mass-create facet combinations
- Use `SeoFacetRule` + admin approval
- Cache: pages are dynamic; sitemap queries are batched (no N+1 per URL write)
