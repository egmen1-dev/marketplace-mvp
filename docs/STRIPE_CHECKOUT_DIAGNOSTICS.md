# Stripe Checkout Diagnostics

**Epic:** STRIPE-CHECKOUT-DIAGNOSTICS-001  
**Date:** 2026-08-15  
**Environment:** Railway staging `web-v2` (`APP_ENV=staging`)  
**Diagnostic script:** `scripts/stripe-checkout-diagnostics.ts` (temporary)

---

## Executive summary

Stripe Checkout **sessions are created successfully**, but **payments cannot complete** because the connected Stripe account is **not activated for charges**. The app also **does not restrict payment methods**, so Stripe adds **`link`** alongside **`card`** via the account’s default Payment Method Configuration — matching the browser console warning about Link not being activated.

**Root cause (ordered):**

1. **Stripe account not charge-ready** — `charges_enabled: false`, `details_submitted: false` on `acct_1Tlrsd2LvF2bg44w`
2. **Implicit payment methods** — application code omits `payment_method_types` / `automatic_payment_methods`, so Stripe returns `["card", "link"]` instead of card-only
3. **Checkout UI symptom** — Stripe.js warns that **Link** is displayed in Test mode but not activated; Pay button stalls because the account cannot settle payments

This is a **Stripe Dashboard / account onboarding configuration issue**, not a wallet business-logic bug.

---

## 1. Checkout Session creation (application code)

### Wallet top-up (`lib/lot-wallet/topup.ts`)

| Field | Value in request |
|-------|------------------|
| `payment_method_types` | **not set** |
| `automatic_payment_methods` | **not set** |
| `currency` | `rub` (via `toStripeCurrency("RUB")`) |
| `mode` | `payment` |
| `success_url` | `https://web-production-e56fb.up.railway.app/account/wallet?tab=topup&topup=success&session_id={CHECKOUT_SESSION_ID}` |
| `cancel_url` | `https://web-production-e56fb.up.railway.app/account/wallet?tab=topup&topup=canceled` |

### Order checkout (`features/payments/create-checkout-session.ts`)

Same pattern: **`payment_method_types` and `automatic_payment_methods` are not set**; `mode: "payment"`, currency from order (typically `rub`), success/cancel URLs set.

### Unsupported methods in **request**

Because `payment_method_types` is omitted, the **request payload contains no explicit method list**. Nothing beyond defaults is requested in code.

When `payment_method_types: ["card"]` was tested manually via diagnostics API, Stripe returned **card only** — confirming the app’s omission is what allows **link** into the session.

---

## 2. Full Checkout Session payload (before Stripe call)

Wallet top-up diagnostic payload (500 ₽):

```json
{
  "mode": "payment",
  "customer_email": "stripe-diagnostics@demo.lot",
  "line_items": [
    {
      "quantity": 1,
      "price_data": {
        "currency": "rub",
        "unit_amount": 50000,
        "product_data": {
          "name": "Пополнение Кошелька ЛОТ",
          "description": "Средства доступны для покупок и продвижения"
        }
      }
    }
  ],
  "success_url": "https://web-production-e56fb.up.railway.app/account/wallet?tab=topup&topup=success&session_id={CHECKOUT_SESSION_ID}",
  "cancel_url": "https://web-production-e56fb.up.railway.app/account/wallet?tab=topup&topup=canceled",
  "metadata": {
    "purpose": "wallet_top_up",
    "userId": "diag-user",
    "amountRub": "500"
  },
  "payment_intent_data": {
    "metadata": {
      "purpose": "wallet_top_up",
      "userId": "diag-user",
      "amountRub": "500"
    }
  }
}
```

**Not present:** `payment_method_types`, `automatic_payment_methods`.

---

## 3. Stripe response (Checkout Session created)

Example session (`cs_test_a1RcpsYdMfyJKy3jm8CdGY0kgHwU6SHqvW26ryvWMW8gKBxmwtQr7z5e9A`):

```json
{
  "id": "cs_test_a1RcpsYdMfyJKy3jm8CdGY0kgHwU6SHqvW26ryvWMW8gKBxmwtQr7z5e9A",
  "mode": "payment",
  "currency": "rub",
  "payment_method_types": ["card", "link"],
  "payment_method_options": {
    "card": { "request_three_d_secure": "automatic" }
  },
  "payment_method_collection": "if_required",
  "payment_method_configuration_details": {
    "id": "pmc_1TlrtA2LvF2bg44wu4T9bPuw"
  },
  "status": "open",
  "payment_status": "unpaid",
  "amount_total": 50000,
  "ui_mode": "hosted_page",
  "adaptive_pricing": { "enabled": true }
}
```

**Important:** Response `payment_method_types` is **`["card", "link"]`** — not card-only — because the app did not constrain methods.

---

## 4. StripeError on payment completion

No `StripeError` was thrown during **`checkout.sessions.create`** — session creation succeeds.

Browser-side (manual E2E, 2026-08-15):

```
[Stripe.js] The following payment method types are not activated:
… (link)

They will be displayed in Test mode, but hidden in live mode.
Please activate the payment method types in your dashboard
(https://dashboard.stripe.com/settings/payment_methods)
```

Pay button enters loading state and does not complete — consistent with account-level charge disablement + Link activation mismatch.

Server-side `payment_intents.confirm` could not be run from the open Checkout Session (`payment_intent: null` on hosted Checkout until client submission).

---

## 5. Key verification (`lib/stripe.ts`)

| Check | Result |
|-------|--------|
| `STRIPE_SECRET_KEY` prefix | **`sk_test_`** ✓ (not live) |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` prefix | **`pk_test_`** ✓ |
| Same Stripe account | **Yes** — key body segments match |
| `isStripeConfigured()` on staging | **true** |

Secret key is loaded from Railway `web-v2` variables; not present in local agent env (only `STRIPE_WEBHOOK_SECRET` locally).

---

## 6. API version

From `lib/stripe.ts`:

```typescript
new Stripe(secret, {
  apiVersion: "2026-07-29.dahlia",
  typescript: true,
});
```

Diagnostic run confirmed SDK uses **`2026-07-29.dahlia`**.  
npm package: **`stripe@^22.4.0`**.

---

## 7. Payment method analysis

### Request (application)

| Method | In code request? |
|--------|------------------|
| `card` | implicit (Stripe default) |
| `link` | implicit (via PMC) |
| anything else | **no** |

### Response (Stripe-assigned)

```json
"payment_method_types": ["card", "link"]
```

**Report:** `payment_method_types` contains **`link` in addition to `card`** — not `["card"]` only. This comes from Stripe’s default **Payment Method Configuration**, not from explicit app fields.

### Payment Method Configuration (`pmc_1TlrtA2LvF2bg44wu4T9bPuw`)

| Method | PMC `available` | Display |
|--------|-----------------|---------|
| card | true | on |
| link | true | on |
| apple_pay | true | on |
| google_pay | false | off |

---

## 8. Stripe account state (critical)

```json
{
  "id": "acct_1Tlrsd2LvF2bg44w",
  "country": "US",
  "default_currency": "usd",
  "charges_enabled": false,
  "payouts_enabled": false,
  "details_submitted": false,
  "capabilities": {}
}
```

| Signal | Meaning |
|--------|---------|
| `charges_enabled: false` | Account **cannot accept payments** |
| `details_submitted: false` | **Onboarding incomplete** |
| `country: US`, checkout `currency: rub` | Cross-currency test checkout (session creates; settlement still blocked by charge disablement) |

`/api/health` reports `stripe.configured: true` because **`STRIPE_SECRET_KEY` is set** — not because the Stripe account can charge.

---

## 9. Root cause statement

> **Why Checkout reports payment methods unavailable / Pay does not complete**

1. The Stripe test account **`acct_1Tlrsd2LvF2bg44w` has `charges_enabled: false`** and incomplete onboarding — payments cannot be captured regardless of Checkout UI rendering.

2. Application Checkout creation **does not set `payment_method_types: ["card"]`**, so Stripe applies PMC **`pmc_1TlrtA2LvF2bg44wu4T9bPuw`** and exposes **`link`** in the hosted Checkout page.

3. Stripe.js logs that **Link is not activated** for this account context, while still displaying it in Test mode — this matches the observed console error during manual top-up E2E.

4. Keys and API version are **correct for test mode** (`sk_test_` / `pk_test_`, same account, API `2026-07-29.dahlia`). The failure is **account + payment-method activation**, not wrong live/test key pairing in code.

---

## 10. Recommended remediation (manual — not applied in code)

Per epic scope, **no automatic fixes were made**. Operator actions:

1. **Complete Stripe account activation** in Dashboard (business details) until **`charges_enabled: true`**
2. **Payment methods settings** — https://dashboard.stripe.com/settings/payment_methods — ensure **Card** (and Link only if desired) are activated for the account
3. Optionally, future code change (separate task): set `payment_method_types: ["card"]` on Checkout Session create to avoid Link surfacing when not wanted

---

## 11. How to re-run diagnostics

```bash
railway run --service web-v2 --environment production -- \
  npx tsx scripts/stripe-checkout-diagnostics.ts
```

Requires Railway-linked project with staging `STRIPE_SECRET_KEY` / `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`.

---

## 12. Files inspected (read-only)

| File | Role |
|------|------|
| `lib/stripe.ts` | SDK init, API version, key loading |
| `lib/lot-wallet/topup.ts` | Wallet Checkout Session create |
| `features/payments/create-checkout-session.ts` | Order Checkout Session create |
| `features/payments/lib/amounts.ts` | RUB → `rub`, kopeck conversion |

**No business-logic changes.** Temporary artifact: `scripts/stripe-checkout-diagnostics.ts`.
