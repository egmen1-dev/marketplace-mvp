# Alpha Tester Package (Closed Alpha v0)

**App:** ЛОТ Alpha · `ru.lot.marketplace.alpha` · `0.1.0-alpha`  
**Backend:** staging only — `https://web-production-e56fb.up.railway.app`

## 1. Download

1. Obtain APK from team channel (not public store).
2. Verify SHA256 before install:

```bash
sha256sum lot-android-alpha-0.1.0.apk
# expected: 91adc3822f4e1cc898bb605f2afb78a47c62d701a6054b5e92603cd0a1628585
```

## 2. Install (Android)

1. Settings → Security → allow install from unknown sources (or per-app for Chrome/Files).
2. Open APK file → Install.
3. Launch **ЛОТ**.

## 3. Test account

Use credentials provided by team (staging demo accounts). Do not share passwords in bug reports.

## 4. 10-minute test script

| Step | Action | Expected |
|---|---|---|
| 1 | Launch app | Splash → login, no crash |
| 2 | Login | Buyer home loads with data |
| 3 | Catalog → open product | PDP with price/image |
| 4 | Add to cart | Item appears in cart |
| 5 | Favorites toggle | State changes |
| 6 | Profile → Seller mode | Seller tabs appear |
| 7 | Seller home | Money/orders/products counts |
| 8 | Wallet | Balances visible |
| 9 | Airplane mode → reopen home | Offline banner + cached snapshot |
| 10 | Profile → Report error | Share sheet with JSON (no tokens) |

## 5. Bug reporting

Profile → **Сообщить об ошибке** → send JSON to team channel.

Include: what you did, screenshot, error ID from JSON.

**Never send:** password, full error JSON if it contains tokens (should not).

## 6. Update / uninstall

- Uninstall: long-press app icon → Uninstall.
- Update: when team publishes new APK, verify new SHA256 and reinstall (self-update in APP-SHELL-1).

## 7. Known limitations

- Checkout payment staging-only
- Seller product edit minimal
- No push notifications yet
- Alpha channel only — not production

## 8. Rollback

If new Alpha breaks, uninstall and reinstall previous APK SHA256 provided by team.
