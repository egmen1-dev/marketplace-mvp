# EPIC — Web → Mobile Parity Audit + Commerce Header + Buyer–Seller Chat

**Baseline:** RC5.1 `0.1.10-beta.2` (code 10)  
**Verdict:** `READY_FOR_BUILD` (no APK built in this EPIC)  
**Date:** 2026-08-23

## Summary

Full source audit of web (`app/`) vs mobile (`apps/mobile/`) on `main`.  
Closed the **P0 gap: buyer↔seller chat** by wiring mobile to the existing `Conversation`/`Message` Prisma domain (`features/chat/queries.ts`) — no parallel chat backend.

Also shipped:
- `CommerceHeader` (Home + Catalog)
- Real cart + messages badges
- Search entry via `focusSearch=1`
- Profile menu parity restructure
- Mobile chat API (`/api/mobile/conversations/*`)
- Chat screens `/messages` + `/messages/[conversationId]`
- Entry points: PDP, seller storefront, orders, header, profile

## P0 / P1 / P2 Gaps

### P0 (blocking purchase/sale) — **resolved in this EPIC**
| Gap | Resolution |
|-----|------------|
| No mobile chat | `/api/mobile/conversations/*` + inbox/thread UI |
| Update entry (RC5.1) | Already merged PR #144 — unchanged |

### P1 (substantial marketplace impact) — **remaining**
| Gap | Status |
|-----|--------|
| Native checkout | Intentional web handoff (`checkout.tsx`) |
| Order detail screen | List only; chat uses `/api/orders/[id]` |
| Native seller product editor | Read list; create/edit via web |

### P2 (defer)
- Write review on mobile
- Address book / personal data editor
- Platform notifications inbox
- Deep seller analytics

## Commerce Header

`apps/mobile/src/components/CommerceHeader.tsx`

```
[ LOT ]     [ Search ] [ Messages ] [ Cart ]
```

- LOT → `/(tabs)` home
- Search → `/(tabs)/catalog?focusSearch=1`
- Messages → `/messages` (badge: `badges.messages`)
- Cart → `/cart` (badge: `badges.cart`)

Shown on: Home, Catalog. Hidden on cart/checkout/messages thread/settings/update.

## Chat Architecture

**Source of truth:** existing web domain  
- Prisma: `Conversation`, `Message`  
- Queries: `features/chat/queries.ts`  
- Unique: `(productId, buyerId)`

**Mobile API (new):**
| Method | Route | Purpose |
|--------|-------|---------|
| GET | `/api/mobile/conversations` | Inbox + unreadTotal |
| POST | `/api/mobile/conversations` | Create/find by productId |
| GET | `/api/mobile/conversations/unread` | Aggregate unread |
| GET | `/api/mobile/conversations/:id` | Detail (marks read) |
| GET | `/api/mobile/conversations/:id/messages` | Cursor pagination |
| POST | `/api/mobile/conversations/:id/messages` | Send `{ body }` |
| POST | `/api/mobile/conversations/:id/read` | Mark read |

**Unread:** `countUnreadMessagesForUser` → `refreshTabBadges` + `useMessagesBadge` (focus + AppState, no polling).

## Web Fallback Audit

| Route | Reason | Expected |
|-------|--------|----------|
| `login.tsx` | sign-up / forgot password | Yes |
| `checkout.tsx` | Stripe web checkout | Yes |
| `download-apk.ts` | APK browser install | Yes |
| `legal-links.ts` | privacy/terms/about | Yes |
| Commerce nav | — | **No web fallback** (native) |

## Release Gate

`npm run mobile:web-parity:gate` — enforces:
- Required files present
- `verificationLevels.*.apk = NOT_BUILT`
- No version bump
- `mobile:typecheck` PASS

Levels: `SOURCE_PRESENT` → `AUTOMATED_VERIFIED` → `STAGING_VERIFIED` → `APK_PRESENT` → `PHYSICAL_VERIFIED` (see `feature-matrix.json`).

## Tests Added

- `mobile-commerce-header.test.ts`
- `mobile-web-parity.test.ts`
- `mobile-chat.test.ts`
- `mobile-chat-security.test.ts`
- `mobile-chat-unread.test.ts`
- `mobile-search-entry.test.ts`
- `mobile-web-fallback-audit.test.ts`

## Physical Validation (next build)

After next APK:
1. Profile → О приложении — confirm RC5.1+ build identity
2. CommerceHeader badges (cart + messages)
3. PDP → Написать продавцу → thread → send
4. Seller account receives message
5. Header messages badge clears after read
6. Regression: cart, favorites, catalog, update, session

## Files Changed (high level)

**Backend:** `app/api/mobile/conversations/*`, `features/chat/queries.ts`, `app/api/orders/[id]/route.ts`  
**Mobile:** `CommerceHeader`, `messages/*`, `ProfileMenu`, PDP/seller/orders entry points, endpoints, badges  
**Artifacts:** `artifacts/mobile-web-parity/feature-matrix.json`  
**Gate:** `scripts/mobile-web-parity-gate.ts`
