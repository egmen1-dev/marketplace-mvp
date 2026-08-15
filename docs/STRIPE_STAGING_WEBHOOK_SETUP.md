# Stripe Staging Webhook Setup

**Epic:** STRIPE-STAGING-SETUP-001  
**Staging app:** https://web-production-e56fb.up.railway.app  
**Stripe mode required:** **TEST / SANDBOX** (`sk_test_…`, `pk_test_…`)

---

## Что вам нужно сделать вручную в Stripe

### 1. Откройте Stripe Dashboard

Убедитесь, что включён **Test mode** (переключатель вверху).

### 2. Перейдите

`Workbench → Webhooks`

### 3. Нажмите

`Create an event destination`

### 4. Выберите

`Events on your account`

Не выбирайте Connected accounts — проект **не использует Stripe Connect**.

### 5. Выберите следующие события

Только те, которые **реально обрабатывает код** (`features/payments/webhook.ts`):

| Event | Зачем |
|-------|-------|
| `checkout.session.completed` | Оплата заказа + пополнение кошелька ЛОТ |
| `payment_intent.succeeded` | Fallback-финализация оплаты заказа |

**Не включайте** `payment_intent.payment_failed` — handler отсутствует, событие будет игнорироваться.

### 6. Выберите destination

`Webhook`

### 7. Endpoint URL

```text
https://web-production-e56fb.up.railway.app/api/webhooks/stripe
```

Route в коде: `app/api/webhooks/stripe/route.ts` → `POST /api/webhooks/stripe`

### 8. После создания нажмите

`Reveal signing secret`

Он начинается с:

```text
whsec_
```

### 9. Добавьте в Railway (service **web-v2**)

```env
STRIPE_WEBHOOK_SECRET=whsec_...
```

У вас уже должны быть:

```env
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

**Не отправляйте ключи в чат, GitHub или commit.**

### 10. Redeploy Railway

После redeploy проверьте:

```bash
curl -sS https://web-production-e56fb.up.railway.app/api/health | jq '.checks.stripe'
```

Ожидаем:

```json
{
  "configured": true,
  "apiKeyConfigured": true,
  "webhookSecretConfigured": true,
  "environment": "test",
  "secretKeyPrefix": "sk_test_",
  "publishableKeyPrefix": "pk_test_"
}
```

---

## Как код различает типы платежей

Webhook handler: `features/payments/webhook.ts` → `settleCheckout()`

| Payment type | Stripe metadata (фактически в коде) | Webhook branch |
|--------------|-------------------------------------|----------------|
| **LOT Wallet top-up** | `purpose: "wallet_top_up"`, `userId`, `amountRub` | `creditWalletTopUpFromCheckoutSession()` → ledger `BUYER_TOP_UP` |
| **Product order** | `orderId`, `orderNumber`, `userId` (без `purpose`) | `markOrderPaidFromCheckoutSession()` → order paid + finance |
| **Promotion (card)** | — | **Не реализовано** — card path возвращает ошибку в UI |

Promotion сейчас оплачивается **только через Кошелёк ЛОТ** (`purchasePromotionAction` → `payInternalProduct`), без Stripe Checkout.

---

## Wallet top-up contract (verified in code)

```text
startWalletTopUpAction
  → createWalletTopUpCheckoutSession (lib/lot-wallet/topup.ts)
    → metadata.purpose = "wallet_top_up"
  → Stripe Checkout (Hosted)
  → checkout.session.completed webhook
  → creditWalletTopUpFromCheckoutSession
    → ledger BUYER_TOP_UP (idempotencyKey: topup:session:{sessionId})
    → topupSpendableAmount += amount
    → withdrawableDelta = 0
```

- Сумма берётся из `session.amount_total` (Stripe), не из client input
- `userId` из metadata, проверяется server-side при создании session
- Idempotency: duplicate ledger key → no second credit
- Top-up: **spendable = true**, **withdrawable = false**

---

## Product order contract (verified in code)

```text
createCheckoutSessionForOrder
  → metadata: { orderId, orderNumber, userId }
  → checkout.session.completed OR payment_intent.succeeded
  → finalizePaidOrder → finance HELD
```

---

## Webhook security (verified in code)

| Check | Status |
|-------|--------|
| `stripe.webhooks.constructEvent()` | ✅ |
| Raw body (`request.text()`) | ✅ |
| `STRIPE_WEBHOOK_SECRET` required | ✅ |
| Idempotency via `StripeWebhookEvent` | ✅ |
| Duplicate `event.id` → skip work | ✅ |

---

## После настройки webhook

Агент продолжит:

1. Wallet top-up E2E (минимум 500 ₽ test payment)
2. Product order Stripe E2E
3. Promotion wallet E2E (не Stripe card)
4. Duplicate webhook safety check

См. `docs/STRIPE_STAGING_ACCEPTANCE.md`
