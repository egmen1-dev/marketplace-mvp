# LOT Delivery Platform V1 — CDEK

**Status:** Deferred post-RC27 (planning only — no implementation in RC27 preflight)

LOT supports delivery as a real marketplace capability. CDEK API integration is the planned V1 delivery platform vertical.

---

## Scope (future)

- CDEK API authentication
- City/location resolution
- Delivery availability
- Tariff calculation
- Delivery price
- Delivery ETA
- Pickup point search
- Pickup point selection
- Address delivery where supported
- Order delivery snapshot
- Shipment creation
- Shipment identifier
- Tracking number
- Shipment status synchronization
- Webhook/polling strategy
- Seller shipping instructions
- Buyer tracking UX
- Cancellation/error handling
- Idempotency
- Retry behavior
- Sandbox/test environment
- Production credential separation

---

## RC27 interim model

Until CDEK V1 ships:

- Mobile checkout uses browser handoff for delivery/payment selection
- `CartDeliveryCard` / `CheckoutNextStepInfo` explain deferred selection copy
- PDP may show seller pickup points when data-backed
- No fake CDEK integration claims in UI

---

## Not in scope for RC27 preflight

- CDEK API wiring
- Delivery tariff UI
- Shipment lifecycle
- Tracking screens
