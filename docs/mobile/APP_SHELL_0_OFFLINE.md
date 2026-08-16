# APP-SHELL-0 Offline

## Alpha scope

- Cache last buyer home and seller home snapshots in memory (`src/storage/offline-cache.ts`)
- Network banner when offline
- Show cached data with explicit offline label

## Not implemented (honest Alpha boundary)

- Offline write queue
- Background sync

## UX rule

If action requires network (cart edit, checkout, login):

> Для этого действия требуется интернет

No fake “saved offline” for mutations.
