# EPIC-84 P1 Diagnostics — Physical Acceptance (Android)

| # | Scenario | Expected |
|---|----------|----------|
| 1 | Airplane mode boot | Title «Нет подключения к Интернету», connectivity ✗ |
| 2 | API 500 (staging fault) | «Сервис временно недоступен» + HTTP 500 |
| 3 | Bootstrap timeout | Stage + Request timeout + Boot ID visible |
| 4 | Retry | Retry count increments, new pipeline run |
| 5 | Copy diagnostics | Clipboard contains LOT Diagnostics block |
| 6 | Export JSON | Share sheet opens with JSON payload |
| 7 | User report | Share includes tester note + DiagnosticsReport |
| 8 | Hidden diagnostics | Long-press logo → App/Device/Network/Timeline/History |
| 9 | Boot history | Last runs listed with boot id + duration |
| 10 | Telemetry | bootId present in local report / correlation field |

Store evidence under `artifacts/epic-84-p1-diagnostics/screenshots/`.
