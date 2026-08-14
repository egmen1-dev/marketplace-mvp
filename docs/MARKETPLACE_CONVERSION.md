# MARKETPLACE-CONVERSION-AUDIT-001

Conversion intelligence layer — analyzes existing analytics and behavior signals to find where users drop off and what to improve. Does **not** modify catalog, search, ranking, orders, finance, or payments.

## Feature flag

```bash
MARKETPLACE_CONVERSION_ENABLED=true
```

When disabled, `/admin/conversion` falls back to the legacy `lib/conversion` dashboard.

## Pipeline

```
User Journey → Behavior Signals → Conversion Analysis → Problems → Recommendations → UX Improvements
```

## Architecture

```
lib/marketplace-conversion/
  flags.ts
  funnel.ts          — buyer funnel steps + display
  journeys.ts        — journey stage mapping
  drop-offs.ts       — drop-off detection
  segments.ts        — buyer segments + classification
  recommendations.ts — AI-style explanation cards (no new ML)
  seller-conversion.ts
  buyer-conversion.ts
  queries.ts         — admin center, PDP diagnostics
  analytics.ts
  permissions.ts
  index.ts

features/marketplace-conversion/
  components/        — funnel, recommendations, admin, seller, PDP panels
```

Reads from:

- `AnalyticsEvent` table (page_view, product_view, add_to_cart, checkout, purchase, etc.)
- Product views, cart, orders (Prisma)
- `lib/conversion/completeness` for listing quality signals
- Trust Loop ratings when enabled
- Seller dashboard stats

## Surfaces

| Surface | Route | Audience |
|---------|-------|----------|
| Conversion Center | `/admin/conversion` | Admin — funnel, problems, growth |
| Seller conversion | `/account/business` | Seller — views/cart/orders, blockers |
| PDP diagnostics | `/product/[id]` | Seller (own) / Admin — why buyers leave |

## Buyer funnel

Stages: Landing → Homepage → Discovery → Product View → Add Cart → Checkout → Payment → Delivery → Review.

Mapped to existing analytics events in `funnel.ts`.

## Buyer segments

- New user, Returning, Active buyer, Abandoned cart, Category buyer

Classified in `buyer-conversion.ts` via `getBuyerConversionContext(userId)`.

## AI explanation format

Each recommendation includes:

- **Problem** — what is wrong
- **Why** — human-readable cause
- **Data** — numbers from analytics
- **Action** — next step (+ optional CTA)

Reuses Seller BI / completeness signals — no new AI models.

## Analytics events

- `conversion_funnel_view`
- `dropoff_detected`
- `conversion_problem_view`
- `conversion_action_click`
- `seller_conversion_view`
- `buyer_segment_view`

## Tests

```bash
npm test -- tests/marketplace-conversion.test.ts
MARKETPLACE_CONVERSION_ENABLED=true npx playwright test tests/e2e/marketplace-conversion.spec.ts
```

## Integrations

- **Seller Business Intelligence** — next actions complement conversion blockers
- **Seller Journey** — new seller problem in admin center
- **Promotion Center** — linked from seller conversion panel
- **UX Completion** — PDP trust blocks coexist with seller diagnostics

## Future improvements

- Unique visitor funnel with session stitching
- Real-time drop-off alerts for admins
- Segment-specific homepage modules
- A/B test hooks on recommendation CTAs
