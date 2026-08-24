# EPIC 159 — Physical Seller & Beta Acceptance Checklist

Manual verification on physical Android. Cloud agents document `NOT_RUN` until operator completes this list.

**Accounts**

| Role | Email | Password |
|------|-------|----------|
| Seller | `seller@demo.lot` | `demo1234` |
| Buyer | `buyer@demo.lot` | `demo1234` |

**Baseline APK:** Closed Beta RC9.1+ (`0.1.14-beta.2`, versionCode 15) or newer RC after EPIC 158.3/159 merge.

---

## Scenario A — Create LOT (seller@demo.lot)

| # | Step | Expected | Result |
|---|------|----------|--------|
| A1 | Продать → Создать ЛОТ | Wizard opens | ☐ PASS / ☐ FAIL |
| A2 | Add photo (camera or gallery) | Photo appears in grid | ☐ |
| A3 | Fill: название, категория, цена, количество, описание, состояние, город | All fields accept input | ☐ |
| A4 | Enable самовывоз + select point | Point selected | ☐ |
| A5 | Copy is human-readable (no «черновик», no technical errors) | | ☐ |
| A6 | Kill app mid-flow → reopen | «Вы начали создавать ЛОТ» + Продолжить / Удалить | ☐ |
| A7 | Autosave indicator shows «Сохранено» | | ☐ |

## Scenario B — Publish LOT

| # | Step | Expected | Result |
|---|------|----------|--------|
| B1 | Preview screen title | «Проверьте ЛОТ» | ☐ |
| B2 | Photo fills block (cover, no black bars) | | ☐ |
| B3 | Primary CTA | Orange «Опубликовать ЛОТ» sticky bottom | ☐ |
| B4 | Publish success | «🎉 ЛОТ опубликован» + «Ваш ЛОТ теперь виден покупателям» | ☐ |
| B5 | Buttons | «Посмотреть ЛОТ», «Создать ещё один» | ☐ |
| B6 | Save then publish (no duplicate LOT) | Same LOT updated, not two entries in «Мои ЛОТы» | ☐ |

## Scenario C — Buyer flow (buyer@demo.lot)

| # | Step | Expected | Result |
|---|------|----------|--------|
| C1 | Catalog → find seller's LOT | Visible with photo, price | ☐ |
| C2 | Open PDP | Seller, price, qty, chat CTA | ☐ |
| C3 | Add to cart → checkout → pay (staging) | Order created | ☐ |
| C4 | Return to app → Заказы | «Заказ оформлен», status readable | ☐ |
| C5 | Chat with seller | Conversation opens | ☐ |

## Scenario D — Seller order flow (seller@demo.lot)

| # | Step | Expected | Result |
|---|------|----------|--------|
| D1 | Продажи → Новые | Buyer order visible | ☐ |
| D2 | Card shows product, qty, buyer, status | | ☐ |
| D3 | «Принять заказ» | Status advances | ☐ |
| D4 | Progress through ship workflow | Status updates visible to buyer | ☐ |

## Scenario E — Update flow

Install APK **one version behind** latest published RC.

| # | Step | Expected | Result |
|---|------|----------|--------|
| E1 | Cold start | Modal «Доступно обновление» | ☐ |
| E2 | Buttons | «Обновить сейчас», «Позже» | ☐ |
| E3 | «Обновить сейчас» | Browser/APK download opens | ☐ |
| E4 | Dismiss modal → Profile | «Обновление доступно» + version | ☐ |
| E5 | Resume from background after new RC | Modal re-appears (if not deferred) | ☐ |

## Scenario F — Trust layer (audit only)

| Element | Visible on PDP / storefront? | Result |
|---------|------------------------------|--------|
| Seller name | | ☐ |
| Registration date (`joinedLabel`) | | ☐ |
| Active LOT count | | ☐ |
| Verified badge (if applicable) | | ☐ |
| Chat response hint | | ☐ |

---

**Operator verdict:** ☐ PASS  ☐ FAIL  
**Date / device / APK:**
