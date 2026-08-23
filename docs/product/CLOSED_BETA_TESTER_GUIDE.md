# Closed Beta Tester Guide

This guide helps beta testers complete the full buyer and seller transaction loop on LOT mobile (Closed Beta RC7+).

## Test accounts

| Role | Email | Password |
|------|-------|----------|
| Buyer | `buyer@demo.lot` | `demo1234` |
| Seller | `seller@demo.lot` | `demo1234` |

> Staging seed accounts. Do not use `seller@test.com` / `buyer@test.com` — they are not provisioned.

---

## Buyer checklist

1. **Sign in** with `buyer@demo.lot`
2. **Find a product** — Home or Catalog (e.g. search «дрель» or browse «Строительство и ремонт»)
3. **Open product card** — verify photo, price, seller, delivery badge
4. **Add to cart** — tap «В корзину»; adjust quantity if needed
5. **Checkout** — Cart → «Оформить заказ» → browser opens for secure payment
6. **Pay** on web (Stripe test card in staging) or complete wallet flow if enabled
7. **Return to app** — tap «Открыть в приложении» on the order success page, or switch back to LOT manually
8. **Verify order** — Заказы tab shows «Заказ оформлен» banner and human-readable status
9. **Open order detail** — timeline: Заказ создан → Продавец подтверждает → …
10. **Chat** — «Написать продавцу» opens conversation; system message «Создан новый заказ #…» should appear

### Expected buyer status labels

| System status | You should see |
|---------------|----------------|
| NEW / PAID / AWAITING_SELLER_CONFIRMATION | Ожидает подтверждения |
| CONFIRMED / PROCESSING | Продавец принял заказ |
| SHIPPED / IN_TRANSIT | Передан в доставку |
| DELIVERED / COMPLETED | Заказ завершён |

---

## Seller checklist

1. **Sign in** with `seller@demo.lot` (same or separate device)
2. **Create product (web)** — Продать → «Добавить товар» opens web; create e.g. «Тестовый товар LOT Beta» at 1000 ₽
3. **Wait for buyer order** (or coordinate with buyer tester)
4. **Продажи** — Продать → Заказы; tab «Новые» shows incoming order
5. **Accept** — tap «Принять заказ»
6. **Ship** — «Передать в доставку» when ready
7. **Messages** — verify unread badge; order system message in chat thread

### Seller product creation

Native product editor is **not** in mobile beta. Use web handoff from the Sell tab.

---

## Full transaction scenario (EPIC gate)

### Seller setup

```
seller@demo.lot → web → create product
  Title: Тестовый товар LOT Beta
  Price: 1000 ₽
```

### Buyer path

```
App → Catalog → Product → Cart (qty 2) → Checkout → Pay → Return → Orders
```

### Seller path

```
Продажи → Новые → Принять → Передать в доставку
```

### Buyer verification

```
Заказы → open order → status updated
```

---

## Known limitations (beta)

| Feature | Mobile | Web |
|---------|--------|-----|
| Checkout / payment | Browser handoff | Full |
| Product create/edit | Handoff | Full |
| Payouts | Read-only wallet | Full |
| Push notifications | Not available | In-app |

---

## Reporting issues

Include:

- Account used (buyer/seller email)
- App version (Profile → О приложении)
- Steps to reproduce
- Screenshot of order status or error

---

## Verification commands (operators)

```bash
npm run build
npm run mobile:typecheck
npm test -- tests/mobile-closed-beta-critical-path.test.ts
npm run mobile:epic-154:gate
```

Physical Android pass: document `NOT_RUN` until device checklist completed.
