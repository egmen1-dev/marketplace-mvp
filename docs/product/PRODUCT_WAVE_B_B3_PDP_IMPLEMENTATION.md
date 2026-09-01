# Product Wave B3 — PDP Implementation

**Branch:** `cursor/product-wave-b3-pdp-conversion`  
**Base:** `971180cb6c57ce72aa74c9fd94f07d0b05bb2e4e`  
**Scope:** PDP conversion polish (final Wave B sub-wave)

---

## Hierarchy decisions

First viewport order:

1. `ProductDetailHeader` (back, static city label, favorite/share)
2. `ProductGallery`
3. Title + rating metadata
4. `ProductPriceCard`
5. Sticky purchase bar (overlay)

Below the fold:

1. Characteristics
2. Description
3. Seller block
4. Pickup points (only when API returns points)
5. Reviews
6. Category-popular related rail

---

## Gallery behavior

- Horizontal swipe with paging (`FlatList` + `pagingEnabled`)
- Stable aspect ratio via `PRODUCT_GALLERY_WIDTH` × `0.92`
- Fallback image when URL missing
- Truthful pagination: `1 / N` counter + dots only when `count > 1`
- **Removed:** gallery-level «Похожие» overlay/button (misleading shortcut)

---

## Related products semantics

| Field | Value |
|-------|-------|
| Query | `fetchCatalog({ sort: "popular", categoryId })` |
| Type | `CATEGORY_POPULAR` |
| Title | `Популярное в категории` |
| Filter | `filterRelatedProducts` excludes current product ID |
| Failure | `loadRelated` catches errors → empty rail; PDP remains usable |
| Cards | Canonical `ProductCard` `variant="rail"` |

---

## Seller truth policy

- Badges filtered via `filterTruthfulSellerBadges`
- Blocks: «Быстро отвечает», «Проверенный продавец», «Доставка сегодня», «Поддержка 24/7»
- Preserved: «Написать продавцу» chat action
- `isVerified` icon only when API provides `seller.isVerified`

---

## Sticky bar preservation

- Primary: `Купить сейчас · <price>` → existing checkout browser handoff
- Secondary: `В корзину` / `− qty +` via shared `useCommerceActions`
- `cartBusy` scoped per product with local spinner (no layout shift)
- Safe-area padding via `useSafeAreaInsets`

---

## Error states

| State | UX |
|-------|-----|
| Loading | `ProductDetailSkeleton` (gallery + title + price placeholders) |
| 404 | «Товар не найден» + back action |
| Network/other | «Не удалось загрузить товар» + retry |
| Related failure | Section hidden (non-fatal) |

---

## Tests

```bash
npm test -- tests/mobile-product-wave-b3-pdp.test.ts
```

21 contract tests (WB-B3-01 … WB-B3-20).

---

## Native acceptance checklist

- [ ] First viewport shows gallery, title, price without excessive scroll
- [ ] Gallery has no «Похожие» overlay
- [ ] Single-image product has no fake pagination
- [ ] Multi-image shows `1/N` counter
- [ ] Related rail titled «Популярное в категории»
- [ ] Current product not in related rail
- [ ] Sticky bar: Buy Now primary, cart secondary, safe-area correct
- [ ] Cart/favorite busy per-product on PDP and related cards
- [ ] 404 vs generic error distinct
- [ ] No unsupported trust/delivery claims on PDP

---

## Deferred (intentional)

- AI recommendations / similarity engine
- Pinch-to-zoom gallery
- Reviews redesign
- Checkout redesign
- Recent views rail refresh
- RC27 / MRP changes
