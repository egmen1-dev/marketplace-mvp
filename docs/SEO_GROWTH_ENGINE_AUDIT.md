# SEO Growth Engine Audit — EPIC-A-006

**Scope:** Local + Railway staging. Vercel production not modified.  
**Mass SEO pages:** not auto-created; indexing gated by quality score + admin approval for facet landings.

## 1. What exists

| Area | Status |
|------|--------|
| Root metadata / OG | Yes (`app/layout.tsx`) |
| Catalog `/catalog` metadata | Static |
| Category `/category/[slug]` | `generateMetadata` + listing + facets |
| Product `/product/[id]` | Basic title/description; **ignores** `seoTitle`/`seoDescription` |
| Sitemap | Home, catalog, categories, products (≤5k) |
| Robots | Allow public; disallow admin/api/account |
| Path helpers | `categoryPagePath`, `productTypePagePath` (unrouted) |
| AI SEO (A-004) | `suggestSeo` for seller products only |
| Brand entity (A-004) | DB + search; **no public brand page** |
| Facets (A-003) | Query `f_*` only; **no crawlable landings** |
| JSON-LD / canonical | **Missing** |
| Admin SEO CMS | **Missing** |

## 2. Gaps / growth points

1. ProductType landings (`/catalog/{path}/{type}`)
2. Brand landings (`/brands/{slug}`)
3. Controlled facet landings (approved only)
4. Template engine + quality score gate
5. Internal linking blocks
6. Sitemap: types, brands, approved SEO pages
7. Structured data (CollectionPage / ItemList / Product / Brand)
8. Use product SEO fields in PDP metadata
9. AI text → review → publish (not silent)
10. Search opportunity signals foundation

## 3. Constraints

- Do not rewrite Catalog Core / facet engine
- Do not mass-generate facet combinations
- Empty / low-score pages → `noindex`
- Keep `/product/[id]` compatible; rich slug is optional helper only
