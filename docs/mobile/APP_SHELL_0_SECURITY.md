# APP-SHELL-0 Security (Alpha audit)

## Verified in code review

- [x] Refresh token via expo-secure-store
- [x] No Stripe secret / DB URL in mobile bundle
- [x] HTTPS default for staging API base URL
- [x] Bearer auth bridge on cart/orders/mobile home routes
- [x] CCOS evolution admin not exposed to mobile client
- [x] Telemetry events exclude secrets/PII by contract

## Out of scope

- Production APK signing (APP-SHELL-1)
- Certificate pinning
- Biometric unlock (APP-SHELL-1)

## Admin

Admin panel remains web-only — not included in mobile Alpha.
