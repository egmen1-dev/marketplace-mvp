# MVP-AUDIT-001 — Full Reality Audit (Railway Staging)

**Audited:** 2026-08-13  
**Runtime URL:** https://web-production-e56fb.up.railway.app  
**Repository `origin/main` tip:** `f5591e0`  
**Vercel production:** not touched (audit scope = Railway staging only)

**Evidence artifacts:**

| Artifact | Path |
|----------|------|
| Machine-readable report | `/opt/cursor/artifacts/mvp-audit-001-report.json` |
| Audit runner | `scripts/mvp-audit-001.mjs` |
| Homepage desktop 1920 | `/opt/cursor/artifacts/screenshots/mvp-audit-home-desktop-1920.png` |
| Homepage mobile 390 | `/opt/cursor/artifacts/screenshots/mvp-audit-home-mobile-390.png` |
| Admin ads panel | `/opt/cursor/artifacts/screenshots/mvp-audit-admin-ads.png` |
| Deploy verify | `EXPECTED_COMMIT=f5591e0 node scripts/deploy-verify.mjs` → **13/13 PASS** |

---

## 1. Deployment reality check

### Live endpoints

| Endpoint | Status | Payload (key fields) |
|----------|--------|----------------------|
| `GET /api/version` | **200** | `environment: staging`, `commit: f5591e0`, `buildTime: 2026-08-13T11:05:04.275Z`, `version: 0.1.0` |
| `GET /api/health` | **200** | `ok: true`, `version.commit: f5591e0`, `checks.database.ok: true`, `checks.auth.ok: true`, `checks.storage.ok: true`, `checks.stripe.ok: false` |

### Comparison with `origin/main`

| Field | Live staging | `origin/main` | Match |
|-------|--------------|---------------|-------|
| Commit | `f5591e0` | `f5591e0` | ✅ |
| Service | `web-v2` (GitHub → Docker) | — | Deploy pipeline healthy |
| DB | connected | — | ✅ |

**Conclusion:** Staging is **in sync with `main`**. Open PR branches (`cursor/design-001-d03e`, `cursor/design-001-1-d03e`) are **not** on staging.

### Feature deployment matrix

| Feature | Expected commit | Live commit | Status |
|---------|-----------------|-------------|--------|
| **DESIGN-001** (full homepage redesign) | `2ce6c7b` (PR #17, **not merged**) | `f5591e0` | ❌ **NOT DEPLOYED** — only pre-DESIGN light homepage on `main` |
| **DESIGN-001.1** (conversion audit fixes) | `a7aee8e` (PR #18, **not merged**) | `f5591e0` | ❌ **NOT DEPLOYED** |
| **ADS-READY** (eligibility + admin panel) | `c53ad08` / `46b3e04` (merged PR #14) | `f5591e0` | ✅ **DEPLOYED** (readiness only, no ad platform) |
| **A-007** (Conversion Intelligence) | `38723c7` (on `main`) | `f5591e0` | ✅ **DEPLOYED** |
| **SEO** (EPIC-A-006 engine + admin) | `8a0d466` (on `main`) | `f5591e0` | ⚠️ **PARTIAL** — admin/UI in code + staging; **sitemap broken at runtime** |
| **Analytics** (UX-005 baseline) | `ee197b1` (on `main`) | `f5591e0` | ✅ **DEPLOYED** — `POST /api/analytics/events` → 200 |

---

## 2. Homepage audit (actual staging)

### Expected DESIGN-001 checklist vs runtime

| Element | DESIGN-001 expectation | On staging now | Notes |
|---------|------------------------|----------------|-------|
| New hero (dark marketplace shell) | `home-marketplace`, new H1 | ❌ | Light theme; H1: **«Покупайте и продавайте всё в одном месте»** |
| Large search | Hero search + header search | ✅ | Hero search present; no `data-testid="home-hero-search"` |
| Featured product | Hero showcase card | ✅ | Drill card with price, seller, stock |
| Thumbnails | 4 mini tiles under hero | ❌ | Single featured card only (no thumbnail row on live build) |
| Categories | Popular categories grid | ✅ | 5 tiles with counts |
| Marketplace stats | Live counters bar | ⚠️ | Not visible above fold; partial old layout may omit DESIGN-001 stats block |
| Trust block | Trust strip + trust section | ✅ | 4 trust items under hero |
| Seller CTA | Dedicated seller block | ⚠️ | **«Продать товар»** button in hero; no DESIGN-001 `HomeSellerCta` section |
| «Новинки» section | Separate product grid | ❌ | Only **«Популярные товары»** on current `main` homepage |
| Mobile sticky catalog | VK funnel CTA | ❌ | Not in deployed commit |

### Why DESIGN-001 is missing

| Cause | Detail |
|-------|--------|
| Not merged | PR #17 / #18 remain **draft**, not in `main` |
| Not wrong service | `/api/version` commit matches `main`; deploy verify 13/13 |
| Not runtime error | Homepage **200**, DB OK; old template renders intentionally |

### Screenshots (actual staging)

- Desktop 1920: `mvp-audit-home-desktop-1920.png`
- Mobile 390: `mvp-audit-home-mobile-390.png`

---

## 3. Marketplace promotion / Ads audit

> **Verdict:** ADS-READY реализован как **backend readiness + admin dashboard**. Полноценной рекламной платформы (кампании, ставки, promoted placement) **нет**.

### Admin `/admin/ads` — ✅ EXISTS & WORKS

| Check | Staging |
|-------|---------|
| Route | **200** (after admin login) |
| Ads readiness panel | ✅ `data-testid="admin-ads-panel"` |
| READY / BLOCKED filters | ✅ |
| Quality score column | ✅ visible |
| Promotion controls (launch campaign, boost) | ❌ **0 controls** |

### Seller — ⚠️ READINESS ONLY

| Check | Staging |
|-------|---------|
| «Продвинуть товар» button | ❌ none |
| Ad settings / budget UI | ❌ none |
| Product ad eligibility banner | ✅ on **edit** when score &lt; 75 or blocked (`product-ad-eligibility-banner`) |
| Quality score card | ✅ on product edit (`product-quality-card`) |

### Product (buyer-facing)

| Check | Staging |
|-------|---------|
| Promoted badge on PDP | ❌ |
| Paid placement in catalog/home | ❌ |
| Promotion analytics for seller | ❌ |

---

## 4. Existing feature audit

### Catalog Core — ✅ WORKS on staging

| Capability | Staging |
|------------|---------|
| Categories tree | ✅ `/categories`, `/catalog/{slug}` |
| ProductType taxonomy | ✅ admin **Taxonomy Import**, category pages |
| Facet filters | ✅ `data-testid="catalog-facet-filters"` on `/catalog/electronics` |
| Characteristics | ✅ facet system wired in catalog UI |

### AI Product Understanding — ✅ WORKS (with UX caveat)

Flow on `/account/products/new`:

1. Open form → AI card **hidden** until title ≥ 5 chars (by design).
2. Enter title → **«AI-анализ названия»** appears (`data-testid="ai-understanding-card"`).
3. `POST /api/product-understanding` → **200** with category suggestion + attributes.
4. Apply → fills characteristics (seller must click apply).

Admin **AI Understanding** page → **200**.

### SEO Engine — ⚠️ PARTIAL

| Surface | Code | Staging |
|---------|------|---------|
| SEO admin `/admin/seo` | ✅ | ✅ **200** |
| Controlled landing routes `/catalog/seo/...` | ✅ | ✅ routes exist in codebase |
| `sitemap.xml` | ✅ | ❌ **Broken:** only **4 URLs**, all `http://localhost:3000/...` |
| Dynamic product/category URLs in sitemap | ✅ | ❌ not emitted (sitemap fallback / build-time DB miss) |
| `robots.txt` | ✅ | ✅ 200, disallows admin/api |

**Root cause (staging config):** `NEXT_PUBLIC_APP_URL` defaults to `http://localhost:3000` when unset at build; sitemap cached (`x-nextjs-cache: HIT`) with static fallback.

### Analytics — ✅ WORKS

| Surface | Staging |
|---------|---------|
| Event ingestion `POST /api/analytics/events` | ✅ 200 |
| UTM / `ad_landing_view` | ✅ (deploy-verify PASS) |
| Admin `/admin/analytics` | ✅ **200** — heading **«Ads measurement baseline»**, funnel tables present |

### Conversion (A-007) — ✅ WORKS

| Surface | Staging |
|---------|---------|
| `/admin/conversion` | ✅ **200**, `data-testid="admin-conversion"` |
| Low quality products | ✅ `admin-low-quality` |
| PDP trust block | ✅ `pdp-trust-block` on product page |
| Seller quality score | ✅ on product edit |

---

## 5. Buyer journey test (manual + Playwright on staging)

Path: **Home → Catalog → Product → Cart → Sign-in → Checkout**

| Step | Result | Notes |
|------|--------|-------|
| Homepage | ✅ | Loads, hero + categories |
| Catalog | ✅ | Grid + filters |
| Product PDP | ✅ | Title, price, add to cart |
| Add to cart | ✅ | Button works |
| Cart | ✅ | `/cart` |
| Auth | ✅ | Demo buyer `buyer@demo.lot` sign-in (registration page `/auth/sign-up` also **200**) |
| Checkout | ✅ | CDEK delivery UI, trust copy; **Stripe not configured** (`health.checks.stripe.ok: false`) — card payment path may be limited |

**Breakages:** none on happy path with demo accounts.  
**Gaps:** new-user **registration → checkout** not fully exercised in this run (sign-up page exists).

---

## 6. Seller journey test

Path: **Sign-in → Products → Create → Edit → Public PDP**

| Step | Result | Notes |
|------|--------|-------|
| Seller sign-in | ✅ | `seller@demo.lot` |
| Product list | ✅ | 38 product links |
| Create product form | ✅ | Sections: Основное, Получение, Габариты, SEO |
| AI understanding | ✅ | After title input; API 200 |
| Quality / ad readiness | ✅ | On edit: quality card + eligibility banner when not ad-ready |
| Photo upload | ⚠️ | Storage configured on staging (`health.storage.ok`); not re-tested end-to-end |
| Published public view | ✅ | PDP loads from catalog |
| Promotion | ❌ | No seller-facing ads controls |

---

## 7. Admin audit

All routes tested **authenticated as `admin@demo.lot`**.

| Section | Route | HTTP / UX | Notes |
|---------|-------|-----------|-------|
| Dashboard | `/admin` | ✅ 200 | Platform summary |
| Users | `/admin/users` | ✅ 200 | |
| Products | `/admin/products` | ✅ 200 | **56** products in moderation list |
| Orders | `/admin/orders` | ✅ 200 | OMS filters |
| Analytics | `/admin/analytics` | ✅ 200 | Ads measurement baseline |
| Conversion | `/admin/conversion` | ✅ 200 | A-007 dashboard |
| Ads | `/admin/ads` | ✅ 200 | Readiness panel |
| SEO | `/admin/seo` | ✅ 200 | |
| Taxonomy | `/admin/taxonomy/import` | ✅ 200 | |
| AI Understanding | `/admin/ai-understanding` | ✅ 200 | |
| Categories | `/admin/categories` | ✅ 200 | Tree UI (not table rows) |
| Sellers | `/admin/sellers` | ✅ 200 | **10** stores |
| Messages | `/admin/messages` | ✅ (in nav) | Not deep-tested |
| Reservations | `/admin/reservations` | ✅ (in nav) | Not deep-tested |

No **404** on core admin modules.

---

## 8. Database audit

| Check | Result |
|-------|--------|
| Prisma / Postgres reachable | ✅ `health.checks.database.ok: true` |
| Pending migrations signal | ⚠️ **Not observable** from outside container; app boots and queries succeed → likely **applied** |
| Failed migrations signal | ❌ none exposed via public API |

### Data present (from admin UI + catalog)

| Entity | Approx. count (staging) |
|--------|-------------------------|
| Products | **56** (admin products) |
| Sellers | **10** stores |
| Categories | Tree with active subs (homepage shows per-category counts) |
| ProductType | Present via taxonomy / catalog facets |
| Orders | OMS list loads (exact count not captured) |

---

## 9. Feature reality matrix

| Feature | Exists in code | Exists on staging | Works | Notes |
|---------|----------------|-------------------|-------|-------|
| **New Homepage (DESIGN-001)** | YES (PR #17) | NO | NO | Staging = pre-DESIGN `main` homepage |
| **DESIGN-001.1 fixes** | YES (PR #18) | NO | NO | Not merged |
| **Legacy homepage v2** (hero search + showcase) | YES (`main`) | YES | YES | Light theme, old copy |
| **Ads platform** | NO | NO | NO | Readiness only |
| **Ads readiness admin** | YES | YES | YES | READY/BLOCKED, quality score |
| **AI product creation** | YES | YES | YES | Triggers after title ≥ 5 chars |
| **SEO admin + landings** | YES | YES | YES | Admin OK |
| **Sitemap / SEO indexation** | YES | YES (route) | **NO** | localhost URLs, 4 entries only |
| **Analytics events** | YES | YES | YES | API + admin dashboard |
| **Conversion intelligence (A-007)** | YES | YES | YES | Admin + PDP trust + seller quality |
| **Catalog Core** | YES | YES | YES | Categories, facets, ProductType |
| **Buyer checkout** | YES | YES | PARTIAL | Flow OK; Stripe optional off |
| **Seller promotion UI** | NO | NO | NO | Only eligibility warnings |
| **Promoted product badge** | NO | NO | NO | — |
| **Stripe payments** | YES | CONFIG | NO | `stripe.ok: false` on staging |

---

## 10. Final verdict

### A. What actually works (staging today)

- Deploy pipeline: **`main` = staging** (`f5591e0`), health/version/analytics verified.
- Core marketplace: **catalog, PDP, cart, checkout shell, CDEK**, demo auth.
- Seller: **CRUD, AI understanding, quality/ad-readiness hints**.
- Admin: **users, products, orders, ads readiness, analytics, conversion, SEO, taxonomy, AI**.
- Trust / conversion layer on PDP and checkout.

### B. What exists only in code / PR (not on staging)

- **DESIGN-001** full homepage (`home-marketplace`, new hero, новинки, sticky catalog, DESIGN analytics events).
- **DESIGN-001.1** mobile-first hero fixes.
- Any commits after `f5591e0` on unmerged branches.

### C. What is missing (product expectation vs reality)

- **Advertising platform** (campaigns, promoted slots, seller boost UI, promoted badges).
- **Production-grade SEO on staging** (canonical URL + full sitemap).
- **DESIGN-001** investor-grade homepage on live URL.
- **Stripe** on staging (optional but off).

### D. Critical blockers before launch

1. **Merge + deploy DESIGN-001** (and 001.1) if marketing homepage is launch criteria.
2. **Fix Railway `NEXT_PUBLIC_APP_URL`** → regenerate sitemap with real domain + product URLs.
3. **Clarify ads scope** — readiness ≠ ads product; set expectations for VK traffic.
4. **Payment path** — enable Stripe or document pickup-only MVP on staging.
5. **Do not confuse staging with Vercel prod** — this audit is Railway only.

---

## Final answers

| Question | Answer |
|----------|--------|
| **READY FOR USERS** | **YES** (limited) — core buy/sell/browse works with demo data; gaps in payments/SEO config |
| **READY FOR ADS** | **NO** — no ad delivery platform; DESIGN homepage not live; sitemap broken |
| **READY FOR INVESTOR DEMO** | **NO** — homepage not DESIGN-001; ads story is readiness-only; sitemap localhost issue undermines SEO narrative |

---

*Audit method: HTTP probes, `deploy-verify.mjs`, Playwright journey scripts (`scripts/mvp-audit-001.mjs`), admin UI inspection, comparison of `origin/main` vs open PR branches. No production/Vercel changes.*
