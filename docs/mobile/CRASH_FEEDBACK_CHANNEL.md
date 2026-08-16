# Crash / Error Feedback Channel (Alpha foundation)

## Goal

Minimal «Сообщить об ошибке» without secrets or PII.

## Client payload (generated on device)

```json
{
  "errorId": "alpha-1734432000000",
  "appVersion": "0.1.0-alpha",
  "buildNumber": "1",
  "releaseChannel": "alpha",
  "platform": "android",
  "model": "Pixel 6",
  "screen": "profile",
  "apiVersion": "mobile-v1"
}
```

## Flow

1. User taps **Сообщить об ошибке** in Profile
2. App posts telemetry `error_report_requested`
3. Native share sheet opens with JSON report (user sends to team channel)

## Excluded fields

- access/refresh tokens
- email/password
- payment data
- admin secrets

## APP-SHELL-1

Replace share-only flow with crash reporting SDK + backend ingest endpoint.
