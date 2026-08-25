# EPIC 174 — Physical Acceptance (Seller Android + Admin Web)

Status: NOT_RUN

## Seller Android

1. Submit LOT → pending screen with «Проверяем ЛОТ» copy
2. «Мои ЛОТы» → «На проверке»
3. Admin NEEDS_CHANGES → seller sees «Нужно исправить» + reason
4. Seller edits → resubmits → pending again
5. Admin APPROVE → seller «Опубликован», buyer catalog/PDP visible
6. Admin REJECT → seller «Отклонён», buyer never sees LOT

## Admin Web

1. Queue counters load
2. Open LOT detail
3. Approve / Needs changes / Reject / Escalate
4. Concurrent decision → second moderator gets conflict message
5. Audit history present in `product_moderation_audit_events`

## Update regression (separate from EPIC 174)

After next RC with update hotfix (#174):
- old APK → update → installer → new versionCode in Profile/About
