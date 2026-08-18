# EPIC-84 Sprint 3 Catalog — Physical Acceptance (Android)

## Checklist

| # | Scenario | Expected |
|---|----------|----------|
| 1 | Open Catalog tab | Search bar visible first; skeleton grid (no full-screen spinner) |
| 2 | Search | Type query → debounced results; recent/popular when empty |
| 3 | Suggestions | With network, typed query shows real API suggestions |
| 4 | Quick filters | Chips switch listing (Все / Новинки / Популярное / Скидки / В наличии) |
| 5 | Sort sheet | Bottom sheet with backend sorts only |
| 6 | Infinite scroll | Scroll down → more products load |
| 7 | Product tap | Opens product detail |
| 8 | Images | Progressive load + placeholder on error |
| 9 | Empty search | «Ничего не найдено» + clear filters |
| 10 | Offline | Dedicated offline message + retry (not infinite spinner) |
| 11 | Error | Section error + retry without killing search UI |
| 12 | Pull-to-refresh | Refreshes listing |

Store screenshots under `artifacts/epic-84-sprint-3-catalog/screenshots/`.
