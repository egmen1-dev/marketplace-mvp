# Alpha Tester Package (Closed Alpha)

**App:** ЛОТ Alpha · `ru.lot.marketplace.alpha` · **`0.1.2-alpha`** (first supported)  
**Backend:** staging only — `https://web-production-e56fb.up.railway.app`

> **Important:** `0.1.0-alpha` and `0.1.1-alpha` are **no longer supported**. Install only `0.1.2-alpha`.

## 1. Download (single link)

**HTTPS (immutable):**  
https://github.com/egmen1-dev/marketplace-mvp/releases/download/closed-alpha-0.1.2/lot-android-alpha-0.1.2.apk

Release page: https://github.com/egmen1-dev/marketplace-mvp/releases/tag/closed-alpha-0.1.2

Verify SHA256 before install:

```bash
sha256sum lot-android-alpha-0.1.2.apk
# expected: 8cf4217c183885ed307e03d6667e039d7e5934743fd7f72f638293d76021b407
```

## 2. Install (Android)

1. Settings → Security → allow install from unknown sources.
2. Open APK → Install.
3. Launch **ЛОТ**.

If you still have 0.1.0 or 0.1.1 installed, the app shows **«Эта версия ЛОТ больше не поддерживается»** — tap **Скачать новую версию**.

## 3. Test account

Use staging demo credentials from team. Do not share passwords in bug reports.

## 4. Updates

After 0.1.2, updates arrive via in-app prompt (`OPTIONAL_UPDATE` → **Обновить** → Android installer).  
First seamless update E2E will be validated on `0.1.2 → 0.1.3`.

## 5. Bug reporting

Profile → **Сообщить об ошибке** → share JSON to team channel (no tokens).

## 6. Version policy

| Version | Status |
|---------|--------|
| 0.1.0-alpha | Unsupported prototype |
| 0.1.1-alpha | Unsupported transitional |
| **0.1.2-alpha** | **Supported baseline** |
