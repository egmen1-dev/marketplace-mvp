# Product Wave B2 — Search implementation

Status: implemented; native acceptance pending.

## State model

- `inputQuery` is the exact current field value and changes on every keystroke.
- `debouncedQuery` records the normalized query whose suggestions are active.
- `committedQuery` is the only text used in the Catalog query key and product request.

Typing does not refresh the product grid. Manual submit, suggestion selection, and history selection all use one `commitSearch` path. That path normalizes whitespace, closes the panel, dismisses the keyboard, clears incompatible category/seller/deals filters, commits the Catalog query, and writes history once.

## Suggest lifecycle

Suggestions start at two normalized characters and use `fetchProductSuggest` after a 300 ms debounce. Empty and one-character input make no request. Every input change advances an independent suggestion generation; only the current generation may publish success, error, or loading completion. Clear and selection explicitly invalidate pending work.

Suggest errors resolve to no suggestions. They never set the Catalog error state and never prevent a manual Catalog search.

## History policy

History remains device-local in Expo SecureStore. Values are trimmed, internal whitespace is collapsed, empty values are rejected, duplicates are compared case-insensitively, the newest spelling is placed first, and the list is capped at eight entries. Focus with an empty field shows the panel only when history exists. Users can select an entry or clear all history.

## Catalog integration

`committedQuery` feeds the existing `buildCatalogQueryKey` and `fetchCatalog` flow. Therefore every changed commit advances the B0 Catalog request generation, resets cursor/items/in-flight pagination state, blocks old-query pages, and retains product-ID deduplication. Clear commits an empty query and uses the same reset path.

The UI is a compact white surface with simple history/search rows and a lightweight inline loading row. It contains no fake popular, trending, AI, or recommendation labels.

## Automated coverage

`tests/mobile-product-wave-b2-search.test.ts` covers WB-B2-01 through WB-B2-21: minimum length, debounce contract, independent generations, clear invalidation, nonfatal failures, normalized single commit, history policy, selection, clear behavior, B0 race/pagination integration, and absence of hardcoded popularity.

Focused regression gates:

- B0: `tests/mobile-wave-b-preflight.test.ts`
- B1 ProductCard: `tests/mobile-product-wave-b-product-card.test.ts`
- B1 Home: `tests/mobile-product-wave-b-home.test.ts`
- Wave A: `tests/mobile-product-wave-a.test.ts`
- Mobile TypeScript: `apps/mobile` `npm run typecheck`

## Native acceptance checklist

- Focus empty search: history appears only when present; clear history works.
- Type zero/one/two characters and confirm suggestions begin only at two after a short pause.
- Type quickly and confirm an older response never replaces the newest list.
- Select a suggestion and a history item; confirm one Catalog refresh, keyboard dismissal, and persistence.
- Submit a whitespace-heavy manual query and confirm normalized results/history.
- Clear during a pending suggestion request; confirm unfiltered Catalog reset and no stale panel return.
- Simulate suggest failure; confirm Catalog submission and browsing remain usable with no full-screen error.
- Open a PDP and return; confirm the committed Catalog query remains.
- Exercise load-more after search and confirm no duplicate or old-query products append.
- Confirm Android back first dismisses normal input UI and navigation remains usable.

B3, seller flows, Checkout, auth, MRP, RC26, and RC27 are outside this implementation.
