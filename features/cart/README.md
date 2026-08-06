# Cart module

Buyer shopping cart: add / update / remove items, totals, guest ↔ auth merge.

## Persistence

- **Guest** — `localStorage` key `lot-cart`: `{ items: [{ productId, quantity }] }`
- **Authenticated** — Prisma `Cart` / `CartItem` via `/api/cart` and server actions

On login, guest items are merged into the DB cart once (`POST /api/cart/merge`), then localStorage is cleared.

## Public API

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/cart` | yes | Cart with products + totals |
| POST | `/api/cart` | yes | Add (increment if exists) |
| PATCH | `/api/cart` | yes | Set quantity (`0` removes) |
| DELETE | `/api/cart?productId=` | yes | Remove line |
| POST | `/api/cart/merge` | yes | Merge guest items |
| GET | `/api/cart/products?ids=` | no | Hydrate products for guest UI |

## UI

- `/cart` — list, qty stepper, remove, summary, «Оформить заказ»
- Header badge via `HeaderCartButton`
- `AddToCartButton` on cards and PDP
