# APP-SHELL-0 Navigation

## Server-driven manifest

`GET /api/mobile/navigation` returns available sections per role/mode.

Mobile tabs:

**Buyer:** Главная · Каталог · Избранное · Заказы · Профиль

**Seller:** Главная · Товары · Продажи · Кошелёк · Профиль

Tab visibility toggled via Expo Router `href: null` when mode mismatches.

## Deep links

| Link | Destination |
|------|-------------|
| `lot://product/{id}` | PDP |
| `lot://order/{id}` | Orders |
| `lot://wallet` | Wallet tab |
| `lot://brain/product/{id}` | PDP (seller intelligence entry) |

## Web links foundation

Future Android App Links / iOS Universal Links map web `/products/{id}` to native PDP — association files deferred until production domain cutover.
