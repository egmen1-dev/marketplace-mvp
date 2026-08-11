# AGENT-019 — Trust & Risk audit (before implementation)

Branch `agent/019-trust-risk-platform` (stacked on TASK 058 ranking + TASK 059 reviews).

## 1. Existing trust signals

- **SellerProfile**: `isVerified` + `verifiedAt`, `kind` (SHOP/INDIVIDUAL), `createdAt`
  (account age), legacy `rating` (placeholder), `isBlocked` (admin soft block).
- **Seller reputation lib** (`features/seller/lib/reputation.ts`): completed orders,
  sales count, active products, join date, badges (NEW_SELLER / VERIFIED / STORE).
- **SellerReviewStats** (TASK 059): `avgProductRating`, `reviewCount` (real reviews).
- **ProductReviewStats** (TASK 059): avg + per-star distribution.
- **ProductRankingStats** (TASK 058): views, orders, completedOrders, unitsOrdered,
  unitsBoughtOut, revenue, conversionRate, buyoutRate, organicScore.
- **LOT Ranking v1** already has a composite `trust` signal (verified + product
  rating + seller reputation + fulfillment).

## 2. Existing fraud / security signals

- **Reviews (059)**: verified-purchase gating (order DELIVERED / reservation
  COMPLETED), no self-review, no duplicate (unique orderItemId), IDOR-checked.
- **Products**: own-product checks (self-chat blocked, self-review blocked).
- **Orders**: order status lifecycle (CANCELLED excluded from sales in ranking).
- **Reservations (057)**: state machine PENDING→CONFIRMED→READY→COMPLETED /
  CANCELLED; buyer/seller cancel/reject transitions.
- **Admin**: `AdminActionLog` audit trail; admin-gated routes via
  `requireAdminSession`.
- **User.isBlocked** / **SellerProfile.isBlocked**: existing soft-block flags.

## 3. Data currently missing (to add)

- No **RiskEvent** log, no **risk score** anywhere.
- No **buyer** trust/reputation stats (only seller-side).
- No **price-anomaly** / **duplicate-listing** / **self-deal** detectors.
- No centralized **rule engine** / **risk thresholds** / **feature flags**.
- No **failed-auth** tracking (architecture only — data not currently persisted).
- No **cancellation/no-show** aggregates per user.

## 4. Owned by CORE-060 (do NOT duplicate)

- **Order lifecycle & state machine** (statuses, transitions, OrderStatusHistory).
  AGENT-019 must not add Order statuses or change transitions. Integration is via a
  **nullable `RiskEvent.orderId` relation** + an **event adapter**
  (`TrustRiskEventConsumer` / `recordRiskSignal`) that later consumes
  ORDER_CREATED/CONFIRMED/CANCELLED/COMPLETED/RETURNED without owning them.

## 5. Where security/risk decisions are made directly today

- Review eligibility (`features/reviews/eligibility.ts`) — kept; AGENT-019 only
  observes review events, never weakens this.
- Product own-checks (chat/review) — kept.
- Admin manual block via `isBlocked` — kept as the only enforcement lever; AGENT-019
  adds analysis + `flagForReview`, not automatic bans (section 57).

## 6. Reusable existing fields

- `SellerProfile.isVerified/verifiedAt/createdAt/isBlocked`, `SellerReviewStats`,
  `ProductReviewStats`, `ProductRankingStats`, `Product.price/productTypeId`
  (price-anomaly vs ProductType median from TASK 058), `Message.createdAt/senderId`
  (chat rate), `PickupReservation.status`, `AdminActionLog` (audit).

## Design decisions

- **Trust ≠ Risk**: separate engines/scores. High trust does not zero out
  per-operation fraud risk.
- **Analysis-first**: default rule effects `LOG_ONLY` / `ADMIN_REVIEW`;
  `RISK_ENFORCEMENT_ENABLED=false` by default — no automatic blocking.
- **Neutral priors**: new buyer/seller = unknown, not bad.
- **Privacy**: no protected/sensitive traits; metadata carries only technical data.
- **Precompute**: `UserTrustStats` / `SellerTrustStats` / `ProductRiskStats` to avoid
  N+1 on PDP/catalog/checkout; reuse `SellerReviewStats`/`ProductRankingStats`.
