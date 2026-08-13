# CLS Performance Fix — RELEASE-HARDENING-001

**Date:** 2026-08-13  
**Scope:** Railway staging / shared codebase (Vercel production unchanged until owner GO)

## Baseline (RELEASE-CANDIDATE-001)

| Page | Viewport | CLS (before) | Target |
|------|----------|--------------|--------|
| Homepage | Desktop 1440×900 | **0.41** | < 0.1 |
| Catalog | Mobile 390px | **0.52** | < 0.1 |

Measured via `scripts/rc-performance.mjs` (PerformanceObserver, 3s window).

## Root causes

1. **`animate-fade-up`** on hero search, CTAs, and product cards — opacity/transform entrance on above-fold content.
2. **Unbounded heading font** not preloaded — FOUT on prices and hero showcase text.
3. **Header cart badge** appearing after mount — layout shift in header actions.
4. **Boot splash** removed instantly from DOM on hydration.
5. **Featured hero block** without reserved min-height during image/font paint.
6. **Catalog infinite grid** — fade-up on first page cards + late image decode on mobile 2-col grid.

## Changes applied

| Fix | File(s) |
|-----|---------|
| Preload Unbounded (`preload: true`) | `app/layout.tsx` |
| Fade-out boot splash before DOM removal | `page-load-observer.tsx`, inline splash CSS |
| Reserve cart badge slot (invisible placeholder) | `header-cart-button.tsx` |
| Remove fade-up from hero search + CTA row | `app/page.tsx` |
| `stableLayout` on ProductCard (skip fade-up) | `product-card.tsx`, homepage + catalog grid |
| `imagePriority` for first 4 homepage cards | `app/page.tsx` |
| Hero showcase `min-h-[280px]` + priority image | `hero-showcase.tsx` |
| Catalog: `stableLayout` for SSR first page items | `infinite-product-grid.tsx` |

## After (local build, post-fix — 2026-08-13)

| Page | Viewport | CLS (after) | vs target |
|------|----------|-------------|-----------|
| Homepage | Desktop 1440 | **0.00** | ✅ |
| Catalog | Desktop 1440 | measure after deploy | < 0.1 |
| Homepage | Mobile 390 | **~0.00** | ✅ |
| Catalog | Mobile 390 | deferred infinite scroll + stableLayout | re-measure |

Run after deploy:

```bash
node scripts/rc-performance.mjs
```

## Verification

```bash
# Desktop homepage + catalog
node scripts/rc-performance.mjs

# Visual regression
node scripts/rc-screenshots.mjs
```

Playwright: `external-traffic`, `traffic-funnel`, `catalog-theme-responsive` against Railway config.

## Out of scope (not changed)

- Catalog Core queries / ranking
- SEO metadata
- Analytics event pipeline architecture
- Product card business logic / AddToCart

## Follow-up if CLS still > 0.1 on staging

- Reduce `rootMargin` on catalog infinite sentinel (600px → 400px) to delay append during first paint window.
- Add explicit `sizes` audit on catalog mobile images.
- Consider `content-visibility: auto` removal on homepage below-fold sections if intrinsic-size mismatch persists.
