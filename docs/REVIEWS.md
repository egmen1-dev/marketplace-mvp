# Reviews, product ratings & seller reputation (TASK 059)

Real buyer reviews and ratings, integrated with LOT Ranking v1 and seller trust.
No fake reviews/ratings anywhere.

## Eligibility (who can review)

A review is only possible for a **real completed purchase** (`features/reviews/eligibility.ts`):

- the `OrderItem` belongs to an order owned by the buyer;
- the purchase is completed — order `DELIVERED`, **or** a `PickupReservation` for
  that order+product+buyer is `COMPLETED` (pickup flow, sections 27/28);
- the product's seller is not the buyer (no self-review);
- no existing review for that `OrderItem` (one review per purchase — unique
  `Review.orderItemId`).

Guests cannot review. All checks are server-side; foreign access (IDOR) is blocked.

## Lifecycle & status

`Review.status`: `PUBLISHED` (default — auto-published, no mandatory moderation),
`HIDDEN`, `REMOVED`, `PENDING_REVIEW` (reserved for a future moderation flow).

- **Create**: rating 1–5 (server-validated int), optional title (≤150) and text
  (≥3, ≤3000). Text is rendered as escaped React children — never
  `dangerouslySetInnerHTML` (XSS-safe).
- **Edit** (buyer): within `REVIEW_EDIT_WINDOW_DAYS = 30`; sets `editedAt`; same row.
- **Delete** (buyer): soft delete → `REMOVED` (no hard delete; auditable).
- **Seller reply**: only the product's seller may reply; buyers can't edit the reply.
- **Admin moderation**: `/admin/reviews` hide/restore/remove; admin cannot fake a
  buyer's rating (status changes only, recorded via `moderatedAt`/`moderatedById`).

## Verified purchase

Every review is tied to an `OrderItem` of a completed order, so the
«Покупка подтверждена» badge is always derived from that relation — never set
manually.

## Aggregates (performance)

Precomputed to avoid per-request aggregation (`features/reviews/aggregate.ts`):

- `ProductReviewStats`: `avgRating`, `ratingCount`, per-star counts. Refreshed on
  every create/edit/delete/moderation. Powers PDP summary + distribution.
- `SellerReviewStats`: `avgProductRating`, `reviewCount` (average across that
  seller's PUBLISHED product reviews).

PDP loads `ProductReviewStats` + a paginated first page of reviews (SSR), then
lazy-loads more via `GET /api/reviews`. Catalog cards never JOIN reviews.

## Display rules

- Product/seller rating shown **only** when `count > 0` (`4.8 ★ · 128 отзывов`).
- Zero reviews → «У этого товара пока нет отзывов» / seller «Пока нет оценок».
  Never `0.0 ★`.

## Ranking integration

See `docs/RANKING.md`. Product rating and seller reputation feed the composite
**trust** signal (15% of LOT Ranking v1) with Bayesian smoothing so a single 5★
review can't dominate and new products/sellers are neutral at cold start.

## Security summary (anti-abuse, first release)

Purchase-gated · unique per purchase · no self-review · no cross-order/foreign
review (IDOR) · server-side rating validation · seller reply authorization ·
admin-gated moderation. Covered by `tests/reviews-eligibility.test.ts`.

## Prepared, not implemented

`ReviewAttachment` (photos) and `ReviewVote` (helpful votes) models exist so the
feature can grow without a migration; no upload/vote UI yet (sections 25/26).
