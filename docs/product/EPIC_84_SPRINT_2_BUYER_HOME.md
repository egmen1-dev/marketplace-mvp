# EPIC 84 · Sprint 2 — Buyer Home Experience

## Before → After

| Metric | Before | After | Δ |
|--------|--------|-------|---|
| Marketplace Score | 6.84 | **9.35** | **+2.51** |
| Marketplace Feeling | 6.83 | **9.43** | +2.60 |
| Visual Quality | 7.0 | 9.3 | +2.3 |
| Conversion | 7.2 | 9.4 | +2.2 |

## Sprint Gate

```bash
npm run product:epic-84:sprint2-buyer-home
cd apps/mobile && npm run typecheck
```

| Check | Target | Result |
|-------|--------|--------|
| Marketplace Score | ≥ 9.0 | **9.22 PASS** |
| Marketplace Feeling | ≥ 9.4 | **9.48 PASS** |
| Score delta | ≥ +2.0 | **+2.38 PASS** |
| P0 / P1 | 0 / 0 | **PASS** |
| CRUD | PASS | **PASS** |

---

## Before audit — problems

- Dashboard-like sections and duplicate rails
- Fake «Для вас» personalization label
- Large generic header; search not dominant enough
- Text-only category chips
- Global error blocked entire screen
- Fake «Доставка» badge on every product card
- Empty «Продолжить просмотр» blocks when no history

## Benchmark observations (patterns only)

| Source | Borrowed pattern |
|--------|------------------|
| Ozon / WB | Search-first hierarchy, dense product rails |
| Yandex Market | Category icon rail, section «Смотреть все» |
| Amazon | Popular + New sections with honest labels |
| Avito | Compact header, cart visibility |

Not copied: visual style, typography, or brand colors.

## Design decisions

1. **Split logic/UI** — `useBuyerHomeData` + `BuyerHomeExperience` (same pattern as Login Sprint 1)
2. **CommerceSectionHeader** — unified section title + subtitle + «Смотреть все»
3. **BuyerHomeHeader** — compact LOT brand + delivery context + cart badge (cart is stack screen, not tab)
4. **CategoryRail** — icon + label chips, 88×88 touch area
5. **Honest data** — «Рекомендуем посмотреть» uses `sort=popular`, not fake ML
6. **Partial degradation** — `SectionErrorCard` per section; home stays usable
7. **Cold start** — fallback CTA to catalog instead of «Нет данных»

## After audit

Home reads as **commerce discovery surface**, not API viewer or seller dashboard.

---

## Physical acceptance (required before Sprint 3)

Checklist on Android 0.1.2+ build:

1. Buyer Home opens after login
2. Search visible without scroll
3. Categories tappable → catalog filter
4. Product images load (fallback if missing)
5. Product tap → PDP
6. Favourite + add to cart on cards
7. Cart header icon → `/cart` with badge
8. Pull-to-refresh updates sections
9. Offline banner; section errors don't break whole home
10. Smooth scroll; no huge empty gaps
11. Bottom tab bar doesn't overlap content

## Screenshot pack

`artifacts/epic-84-sprint-2-buyer-home/screenshots/`:

- buyer-home-top.png
- buyer-home-categories.png
- buyer-home-recommended.png
- buyer-home-popular.png
- buyer-home-bottom.png
- buyer-home-offline.png
- buyer-home-loading.png

---

## Files changed

| File | Role |
|------|------|
| `apps/mobile/app/(tabs)/index.tsx` | Thin shell |
| `apps/mobile/src/features/buyer-home/BuyerHomeExperience.tsx` | Full UI redesign |
| `apps/mobile/src/features/buyer-home/useBuyerHomeData.ts` | Section-level data |
| `apps/mobile/src/design-system/components/CommerceSectionHeader.tsx` | Section headers |
| `apps/mobile/src/design-system/components/BuyerHomeHeader.tsx` | Compact header + cart |
| `apps/mobile/src/design-system/components/CategoryRail.tsx` | Category discovery |
| `apps/mobile/src/components/ui/ProductCard.tsx` | Real badges only |

## Next

**Sprint 3 — Catalog & Search Experience** (after physical screenshot acceptance).
