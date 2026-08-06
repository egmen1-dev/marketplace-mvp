# Orders module

Checkout from cart, CDEK delivery selection, Stripe Checkout Sessions, order history.

## Flow

1. Buyer selects CDEK delivery (ПВЗ / курьер) → quote cost + ETA
2. Submit checkout → `createOrderFromCart` (status `NEW`) + `Delivery` row + Payment `PENDING`
3. Server creates Stripe Checkout Session (`currency: rub`; shipping as separate line item)
4. Client redirects to Stripe-hosted Checkout
5. Success → `/orders/[id]?payment=success`; cancel → `/checkout?canceled=1`
6. Webhook `checkout.session.completed` (and `payment_intent.succeeded`) marks Order `PAID`

## Key paths

- `lib/delivery/` — CDEK provider factory (mock / real)
- `features/orders/components/delivery-section.tsx` — checkout UX
- `features/payments/` — session creation + webhook handlers
- `lib/stripe.ts` — Stripe client singleton
- `app/api/webhooks/stripe/route.ts` — raw-body signature verification
- `app/api/delivery/points`, `app/api/delivery/quote`
