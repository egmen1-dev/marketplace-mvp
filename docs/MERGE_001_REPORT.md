# MERGE-001 — Design Release Integration Report

**Date:** 2026-08-13  
**Staging:** https://web-production-e56fb.up.railway.app

---

## 1. Merge status

| PR | Branch | Merge state (pre-merge) | Result |
|----|--------|-------------------------|--------|
| **#17** DESIGN-001 | `cursor/design-001-d03e` | MERGEABLE, CLEAN | ✅ Fast-forward into `main` (`2ce6c7b`) |
| **#18** DESIGN-001.1 | `cursor/design-001-1-d03e` | MERGEABLE, CLEAN | ✅ Fast-forward into `main` (`a7aee8e`) |

**Conflicts:** none  
**Files touched:** homepage shell (`app/page.tsx`, `app/globals.css`), `components/home/*`, analytics event names (DESIGN-001 only), `lib/home/cached-data.ts`, audit scripts/docs. No Catalog Core / Auth / Checkout changes.

**Follow-up on `main`:** `e54d2a6` — e2e CTA label update (`Открыть каталог` → `Смотреть товары`) for VK funnel tests. Test-only; no UI change.

---

## 2. New SHA

| Ref | SHA | Description |
|-----|-----|-------------|
| DESIGN-001 | `2ce6c7b` | Marketplace homepage redesign |
| DESIGN-001.1 | `a7aee8e` | Visual conversion audit fixes |
| **`main` (design release)** | **`a7aee8e`** | Homepage UI on production path |
| **`main` (latest)** | **`e54d2a6`** | + e2e test alignment |

---

## 3. Railway SHA

| Check | Value |
|-------|-------|
| `GET /api/version` | **`a7aee8e`** |
| `buildTime` | `2026-08-13T12:41:17.513Z` |
| `environment` | `staging` |
| `deploy-verify` (design SHA) | **13/13 PASS** |

Live markers: `home-marketplace`, `Покупайте выгодно`, `home-hero-search`, `Смотреть товары`.

---

## 4. Screenshots before / after

| When | Desktop 1920 | Mobile 390 |
|------|----------------|------------|
| **Before** (pre-merge `f5591e0`) | `merge001-before-desktop-1920.png` | `merge001-before-mobile-390.png` |
| **After** (DESIGN-001.1 live) | `merge001-after-desktop-1920-home-top.png` | `merge001-after-mobile-390-first-screen.png` |

Additional after captures: `design001-desktop-1440-*`, `design001-mobile-390-*` (via `scripts/design-001-1-audit-screenshots.mjs`).

### Visual delta (summary)

| Area | Before | After |
|------|--------|-------|
| Theme | Light homepage | Dark `home-marketplace` shell |
| Hero H1 | «Покупайте и продавайте всё в одном месте» | «Покупайте выгодно. Продавайте легко.» |
| Featured product | Small horizontal card | Large vertical card + thumbnail prices |
| Mobile first screen | No product above fold | Compact featured product before search |
| CTA | «Открыть каталог» | «Смотреть товары» + «Продать товар» |

---

## 5. Tests

| Check | Result |
|-------|--------|
| `npm run lint` | ✅ PASS |
| `npm run build` | ✅ PASS |
| `vitest tests/analytics-events.test.ts` | ✅ 6/6 |
| Playwright `external-traffic.spec.ts` | ✅ 5/5 |
| Playwright `traffic-funnel.spec.ts` | ✅ 2/2 (after CTA update) |

---

## 6. Homepage acceptance (DESIGN-001.1)

| Criterion | Status |
|-----------|--------|
| Hero — marketplace + buy/sell | ✅ |
| Featured product visual weight | ✅ |
| Categories + stats + trust | ✅ (below fold on 1920; visible on scroll) |
| CTA pair (buy / sell) | ✅ |
| Mobile first screen — product visible | ✅ |
| VK WebView (`webview-compat`) | ✅ (e2e) |

---

## READY FOR DESIGN RELEASE: **YES**

DESIGN-001 + DESIGN-001.1 are merged to `main` and deployed on Railway staging at **`a7aee8e`**.
