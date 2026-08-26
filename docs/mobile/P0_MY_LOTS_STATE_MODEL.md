# P0 — My LOTs State Model (canonical)

Single mapping for seller «Мои ЛОТы» tabs. Implemented in `lib/mobile/seller-lots-section.ts`.

## Tabs

| Tab (UI) | Backend `tab` param | Included sections |
|----------|---------------------|-------------------|
| Активные | `active` | `active` only — `Product.status=ACTIVE` AND (`moderation=APPROVED` OR no moderation row) |
| На проверке | `pending` | `pending`, `needs_fix` — not ACTIVE, moderation PENDING_REVIEW or NEEDS_FIX |
| Сохранённые | `drafts` | `drafts`, `rejected` — DRAFT without pending moderation |
| Проданные | `sold` | `sold` — ARCHIVED |

## Section labels (badges)

| Section | Badge |
|---------|-------|
| active | Активный |
| pending | На проверке |
| needs_fix | Нужно исправить |
| rejected | Отклонён |
| drafts | Сохранён |
| sold | Проданные |

## Search contract

- Parameter: `GET /api/mobile/seller/products?tab={tab}&q={query}`
- Scoped to authenticated seller only
- Case-insensitive substring match on `Product.name` (Prisma `contains` + `mode: insensitive`)
- No catalog token explosion; no cross-seller leakage
- Clearing `q` restores full tab list

## Mobile client (RC10.4+ fix)

- Tab state via route param `?tab=`
- `useSellerProductsList` — request sequencing, clear items on tab change
- Server search with 300ms debounce
- Empty states: global vs search miss

## RC10.4 APK note

Physical RC10.4 (code 20) does **not** include mobile hook fixes until a future build. Server API fixes apply after staging deploy without APK change.
