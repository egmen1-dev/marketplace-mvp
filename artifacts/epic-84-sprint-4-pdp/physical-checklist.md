# EPIC-84 Sprint 4 PDP — Physical Acceptance (Android)

## Checklist

| # | Scenario | Expected |
|---|----------|----------|
| 1 | Open product from catalog | Skeleton first, then full PDP (no full-screen spinner) |
| 2 | Gallery swipe | Horizontal swipe between photos; dot indicator updates |
| 3 | Hero price | Large price first; strikethrough + % only if real compareAt |
| 4 | Trust block | Verified/stock/pickup/metrics — no fake СДЭК or ratings |
| 5 | Sticky CTA | «Добавить в корзину» always visible; no «Купить сейчас» |
| 6 | Add to cart | Success feedback; offline shows clear message |
| 7 | Favorite | Heart toggles from sticky bar |
| 8 | Share | Native share sheet with `lot://product/{id}` |
| 9 | Delivery | Shown only when pickup points or pickupEnabled from backend |
| 10 | Highlights | Real product advantages (stock, brand, specs) |
| 11 | Description | Expand / collapse for long text |
| 12 | Specs | Table layout, readable rows |
| 13 | Seller | Store name, verified badge, product count if available |
| 14 | Related | Same-category rail; hidden if none; error does not break PDP |
| 15 | Offline uncached | Dedicated offline screen + retry |
| 16 | Offline cached | Opens cached product + banner |

## Screenshot pack

Save to `artifacts/epic-84-sprint-4-pdp/screenshots/`:

- pdp-gallery.png
- pdp-price.png
- pdp-cta.png
- pdp-specs.png
- pdp-seller.png
- pdp-related.png
- pdp-loading.png
- pdp-offline.png
