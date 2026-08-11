# Risk rules (AGENT-019)

Centralized, code-config rules (`features/trust-risk/rule-engine.ts`). No no-code
builder. Each rule: `id`, `name`, `enabled`, `type`, `severity`, `effect`,
`version`, `description`.

## Effects (section 11)

`LOG_ONLY` · `RAISE_RISK` · `ADMIN_REVIEW` · `LIMIT_ACTION` · `TEMPORARY_HOLD` ·
`BLOCK_ACTION`.

Enforcing effects (`LIMIT_ACTION`/`TEMPORARY_HOLD`/`BLOCK_ACTION`) are **downgraded
to `ADMIN_REVIEW`** unless `RISK_ENFORCEMENT_ENABLED=true` (default false). Signals
below `MIN_CONFIDENCE_TO_RAISE` (40) stay `LOG_ONLY` (false-positive safety).

## Risk levels (section 12)

`0–24 LOW · 25–49 MEDIUM · 50–74 HIGH · 75–100 CRITICAL` (centralized in
`config.ts`, never hardcoded).

## Rule registry (defaults)

| Rule | Type | Severity | Effect |
| --- | --- | --- | --- |
| Аномальная цена | PRICE_OUTLIER | MEDIUM | ADMIN_REVIEW |
| Дубль объявления | DUPLICATE_LISTING | MEDIUM | ADMIN_REVIEW |
| Self-deal | SELF_DEAL_INDICATOR | HIGH | ADMIN_REVIEW |
| Быстрые заказы | RAPID_ORDER_CREATION | MEDIUM | LOG_ONLY |
| Быстрые брони | RAPID_RESERVATION_CREATION | MEDIUM | LOG_ONLY |
| Частые отмены | EXCESSIVE_CANCELLATIONS | MEDIUM | ADMIN_REVIEW |
| Частые отказы | EXCESSIVE_REJECTIONS | MEDIUM | ADMIN_REVIEW |
| Злоупотребление отзывами | REVIEW_ABUSE_INDICATOR | MEDIUM | ADMIN_REVIEW |
| Спам в чате | CHAT_SPAM_PATTERN | LOW | LOG_ONLY |
| Необычная сумма | UNUSUAL_TRANSACTION_VALUE | MEDIUM | LOG_ONLY |
| Подбор входа | FAILED_AUTH_PATTERN | HIGH | ADMIN_REVIEW |
| Неявки покупателя | BUYER_NO_SHOW_PATTERN | MEDIUM | ADMIN_REVIEW |
| Снижение исполнения | SELLER_FULFILLMENT_DEGRADATION | MEDIUM | ADMIN_REVIEW |
| Мульти-аккаунт | MULTIPLE_ACCOUNT_INDICATOR | MEDIUM | LOG_ONLY |

> No rule auto-blocks in the default configuration. Enforcement requires an explicit
> flag + admin policy (section 57 — no automatic production punishment).
