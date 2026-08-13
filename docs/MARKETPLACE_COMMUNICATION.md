# Marketplace Communication (MARKETPLACE-COMMUNICATION-001)

Communication layer between marketplace execution and participants (sellers, buyers, internal operators).

- **Execution** → «Нужно улучшить 500 карточек»
- **Communication** → «Как связаться, что отправить, когда напомнить»

**Human approval required** — messages are prepared and scheduled only; no automatic email/push/SMS without explicit operator confirmation.

## Feature flag

```bash
MARKETPLACE_COMMUNICATION_ENABLED=true   # default: off
MARKETPLACE_EXECUTION_ENABLED=true       # recommended (campaign source)
```

## Architecture

```
Marketplace Execution tasks
        ↓
Communication Campaign (campaigns.ts)
        ↓
Audience (audiences.ts)
        ↓
Message Template (templates.ts)
        ↓
Sequence plan (sequences.ts)
        ↓
Human approval (actions.ts)
        ↓
Send / Complete (logged in-app)
        ↓
Analytics
```

### Module layout

| File | Role |
|------|------|
| `campaigns.ts` | `MarketplaceCommunicationCampaign` from execution |
| `audiences.ts` | Audience engine from growth/intelligence signals |
| `templates.ts` | Non-aggressive message templates |
| `sequences.ts` | Day 0 / 7 / 14 touch planning (no auto-send) |
| `messages.ts` | `prepareCampaignMessages()` + status helpers |
| `permissions.ts` | Admin/seller gates |
| `actions.ts` | Approve/send (AdminActionLog + analytics) |
| `queries.ts` | Dashboard + seller/buyer connections |

## Campaign statuses

`DRAFT` · `READY` · `ACTIVE` · `PAUSED` · `COMPLETED`

## Campaign types

`SELLER_ACTIVATION` · `PRODUCT_IMPROVEMENT` · `PROMOTION_INVITE` · `CATEGORY_GROWTH` · `BUYER_REACTIVATION`

## Audience kinds

`SELLERS_WITHOUT_PROMOTION` · `SELLERS_LOW_QUALITY_PRODUCTS` · `SELLERS_NO_SALES_30_DAYS` · `BUYERS_ABANDONED_CART` · `BUYERS_CATEGORY_INTEREST`

Signals sourced from Seller Growth, Buyer Intelligence, Marketplace Intelligence, and Execution tasks — without changing catalog, search, ranking, orders, finance, or payments.

## Human approval model

1. Execution surfaces a task (e.g. improve weak product cards).
2. Communication builds audience + template + sequence.
3. Admin reviews **Pending approval** on `/admin/communication`.
4. Operator clicks **Одобрить** or **Одобрить и отправить** — logged via `AdminActionLog` (`entityType: MARKETPLACE_COMMUNICATION_MESSAGE`).
5. Real channel delivery (email, push, telegram, SMS) is a future phase.

## Future channels

| Channel | Status |
|---------|--------|
| In-app (cabinet / catalog strips) | Foundation |
| Email | Planned |
| Push | Planned |
| Telegram | Planned |
| SMS | Planned |

## Surfaces

| Route | Audience |
|-------|----------|
| `/admin/communication` | Admin dashboard (campaigns, audiences, templates, approval, results) |
| `/account/growth` | Seller «Рекомендация от ЛОТ» with **Исправить** CTA |
| `/catalog` | Buyer reactivation signals (preview, no auto-send) |

## Analytics

- `communication_view`
- `communication_campaign_created`
- `communication_message_approved`
- `communication_message_sent`
- `communication_clicked`
- `communication_conversion`

## Tests

- Unit: `tests/marketplace-communication.test.ts`
- E2E: `tests/e2e/marketplace-communication.spec.ts`

## Out of scope (unchanged)

Catalog Core · Search · Ranking · Orders · Finance · Payments
