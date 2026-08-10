# Chat (Сообщения)

Product messaging between buyers and sellers, scoped to a listing.

## Architecture

```
PDP "Написать продавцу"
        │
        ▼
startConversationAction (server)
        │
        ▼
getOrCreateConversationForProduct
        │  @@unique([productId, buyerId])
        ▼
/account/messages/[conversationId]
        │
        ▼
ConversationThread → sendMessageAction → sendTextMessage
```

- **No public REST API** for chat. All mutations go through Next.js server actions in `features/chat/actions.ts`.
- **Queries / access control** live in `features/chat/queries.ts`.
- **UI**: header button, account messages list, thread composer, PDP write button.
- **System / order / reservation** messages are created by helpers (`notifyOrderCreated`, `notifyReservation*`) when those domains emit events.

## Conversation lifecycle

| Status     | Meaning                                      |
|------------|----------------------------------------------|
| `ACTIVE`   | Participants can send TEXT messages          |
| `ARCHIVED` | Read-only (send rejected)                    |
| `CLOSED`   | Soft-closed (admin close); send rejected     |

Flow:

1. Buyer (not the listing owner) clicks **Написать продавцу**.
2. Server creates `Conversation` + initial `SYSTEM` message, or returns the existing row for `(productId, buyerId)`.
3. Concurrent creates race on unique constraint → catch `P2002` and return the existing id (no duplicates).
4. Participants exchange `TEXT` messages; `updatedAt` bumps for list sort.
5. Admin may **close** a conversation (status → `CLOSED`). Hard delete is not used in product UI.

## Message types

| Type          | Sender     | Purpose                                      |
|---------------|------------|----------------------------------------------|
| `TEXT`        | User       | Normal chat                                  |
| `SYSTEM`      | `null`     | Lifecycle / UX hints                         |
| `ORDER`       | System     | Order-linked notice (future-rich attachments)|
| `RESERVATION` | System     | Pickup reservation events                    |

Attachment columns (`attachmentUrl`, `attachmentName`, `attachmentMime`) exist for future image/file support; UI does not upload yet.

## Permissions

Rule: **only conversation participants (or ADMIN) may read a thread.**

| Actor              | List own chats | Open thread | Send TEXT | Mark counterpart read | Close (admin) |
|--------------------|----------------|-------------|-----------|-----------------------|---------------|
| Buyer participant  | yes            | yes         | yes       | yes                   | no            |
| Seller participant | yes            | yes         | yes       | yes                   | no            |
| Other buyer/seller | no             | redirect    | no        | no                    | no            |
| Guest              | sign-in        | sign-in     | no        | no                    | no            |
| Admin              | (all via role) | yes         | **no**    | **no** (read-only)    | soft close    |

Enforcement:

- `assertConversationAccess(conversationId, viewer)` — buyer by `buyerId`, seller by `seller.userId`, or `role === ADMIN`.
- `sendTextMessage` requires `senderId === viewer.id` and participant (not admin-only).
- List / unread counts resolve **seller profile id from DB** for `userId` (caller-supplied seller id is not trusted).
- Forbidden thread URLs redirect to `/account/messages` (no message leak).

## Unread logic

- New TEXT messages are created with `isRead: false`.
- Opening a thread as **buyer or seller** marks counterpart messages read (`updateMany` where `senderId !== viewer`).
- Admin open does **not** clear unread for participants.
- Header badge = count of unread messages across conversations where the user is buyer or seller.

## Guest → login continue

1. Guest on PDP clicks **Написать продавцу**.
2. Redirect to `/auth/sign-in?callbackUrl=/product/{id}?writeSeller=1`.
3. After login, PDP effect sees `writeSeller=1` and calls `startConversationAction`.
4. Product context is preserved (no drop to home).

## Order & Reservation integration

- `notifyOrderCreated` / `notifyReservationCreated` / `notifyReservationConfirmed` append typed system messages to the relevant conversation when those flows run.
- Chat remains product-scoped; order/reservation deep-links can be added later via attachments or structured payloads.

## Future attachments

Schema already supports URL/name/mime. Planned:

- Upload via existing blob pipeline with ownership checks.
- Render image/document bubbles in `ConversationThread`.
- Virus / size limits at action layer.

## Key files

- `features/chat/queries.ts` — access, CRUD-ish helpers
- `features/chat/actions.ts` — server actions
- `features/chat/components/*` — UI
- `app/(account)/account/messages/*` — pages
- `tests/e2e/chat-security.spec.ts` — IDOR / guest
- `tests/e2e/chat-regression.spec.ts` — badge + persistence

## Security checklist (acceptance)

- [x] Unique `(productId, buyerId)`
- [x] Participant-only send / read
- [x] Admin cannot clear unread by browsing
- [x] Admin soft-close only
- [x] No chat REST IDOR surface
- [x] Guest gated + continue URL
