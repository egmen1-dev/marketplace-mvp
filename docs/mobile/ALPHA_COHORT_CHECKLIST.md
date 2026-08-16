# Closed Alpha Cohort Readiness (5–10 testers)

## Gate status: NOT READY

Blockers before inviting testers:

- [ ] Physical device acceptance PASS
- [ ] P0 = 0
- [ ] Staging deploy includes APP-SHELL-0 backend bridge
- [ ] APK hosted at controlled HTTPS URL with published SHA256

## Checklist per tester

| Item | Ready |
|---|---|
| APK artifact + SHA256 | ✅ built, ⬜ hosted |
| Installation guide (unknown sources) | ⬜ |
| Staging credentials / test account policy | ⬜ |
| Known limitations doc | ✅ `APP_SHELL_0_ACCEPTANCE.md` |
| Feedback route | ✅ profile «Сообщить об ошибке» + telemetry |
| Rollback build archived | ⬜ |

## Known limitations (share with testers)

- Alpha channel / staging backend only
- Checkout payment staging-only
- Seller product edit minimal
- Offline read-only snapshots
- No push / biometric / self-update yet

## Feedback route

1. Profile → **Сообщить об ошибке** (copies error report JSON)
2. Telemetry event `error_report_requested` (no PII)
3. Manual channel: team chat / email with error ID

## Rollback

Provide previous APK SHA256 + install steps if new Alpha regresses.
