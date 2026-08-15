# Marketplace Integration — Staging Acceptance Report

**Epic:** MARKETPLACE-INTEGRATION-STAGING-ACCEPTANCE-002  
**Prior epic (merged):** MARKETPLACE-INTEGRATION-VALIDATION-001  
**Date:** 2026-08-15  
**Staging URL:** https://web-production-e56fb.up.railway.app

---

## Executive summary

| Area | Verdict |
|------|---------|
| **ACCOUNT UX** | **ACCEPTED** (staging visual + functional smoke) |
| **LOT WALLET (UI / nav / buckets)** | **ACCEPTED** (code + visual; bucket rules unit-tested) |
| **LOT WALLET (financial E2E)** | **NOT ACCEPTED** — Stripe `not_configured`; top-up E2E blocked |
| **PROMOTION** | **ACCEPTED** (visibility + visual; wallet pay E2E blocked by balance/Stripe) |
| **RANKING LAB** | **ACCEPTED** (50 experiments, 100-product audit, artifacts regenerated) |
| **LIVE RANKING** | **NOT ENABLED** (by design) |

---

## PART 1 — Railway deploy verification

| Field | Value |
|-------|-------|
| Main SHA | `ba767f7` |
| Staging SHA | `ba767f7` ✅ |
| Build time | `2026-08-15T10:59:06.704Z` |
| Deploy status | **SUCCESS** |
| Previous staging | `b556424` (superseded) |

```bash
curl -sS https://web-production-e56fb.up.railway.app/api/version
# {"commit":"ba767f7","buildTime":"2026-08-15T10:59:06.704Z",...}
```

---

## PART 2 — Database state

```bash
npx prisma migrate status
# Database schema is up to date
```

Wallet + ranking migrations present, including:

- `20260815100000_lot_wallet_foundation`
- `20260815120000_marketplace_ranking_intelligence`

No `migrate reset` performed. No divergence detected.

---

## PART 3 — Required staging flags (runtime)

Verified via `/admin/system-flags` on staging:

| Flag | Runtime state |
|------|----------------|
| `LOT_WALLET_ENABLED` | ON |
| `SELLER_PROMOTION_CENTER_ENABLED` | ON |
| `MARKETPLACE_RANKING_INTELLIGENCE_ENABLED` | OFF at acceptance time |
| Prior trust/conversion flags | ON (unchanged) |

**Note:** Ranking lab code is deployed; advisory UI shows disabled message until flag is turned ON. Live search remains unaffected regardless.

---

## PART 4–8 — Account UX acceptance

| Gate | Result |
|------|--------|
| `/account` is overview, not edit form | ✅ |
| No duplicate «Мой профиль» + «Настройки» | ✅ |
| Nav: Мой аккаунт / Покупки / Мой бизнес / Кошелёк / Настройки | ✅ |
| `/account/profile` → `/account/settings?section=profile#profile` | ✅ |
| Settings inline (no «Открыть» for name/phone/city) | ✅ |
| Save + reload persistence (name field) | ✅ |
| Password fields `type=password` by default | ✅ |
| Eye toggle hidden ↔ visible | ✅ |
| Notification toggles inline (7 categories) | ✅ |
| Full password change + re-login cycle | ⚠️ Not completed on staging |

Evidence: `settings-inline-desktop.png`, `settings-inline-mobile.png`, `password-hidden.png`, `password-visible.png`

---

## PART 9–11 — Wallet navigation & bucket security

| Gate | Result |
|------|--------|
| «Кошелёк» in unified nav | ✅ |
| No parallel top-level «Баланс» / «Вывод» | ✅ |
| `/account/balance`, `/account/payouts` → wallet | ✅ |
| Wallet tabs (Обзор / Пополнить / Вывести / История / Способы оплаты) | ✅ |
| Russian money labels (no spendable/ledger/bucket in UI) | ✅ |
| Seller released: spendable + withdrawable | ✅ unit tests |
| Top-up: spendable, not withdrawable | ✅ unit tests |
| Bonus: spendable, not withdrawable | ✅ unit tests |
| Held/pending: not spendable, not withdrawable | ✅ unit tests |
| TOP-UP → PAYOUT blocked | ✅ unit tests |
| HELD → PRODUCT PURCHASE blocked | ✅ unit tests |

Evidence: `wallet-overview.png`, `wallet-topup.png`, `wallet-history.png`

---

## PART 12–17 — Financial E2E

### Stripe status (PART 13)

```bash
curl -sS .../api/health
# stripe.configured: false, detail: "not_configured"
```

| Layer | Status |
|-------|--------|
| Code ready | ✅ |
| Runtime provider ready | ❌ `not_configured` |
| E2E payment passed | ❌ **BLOCKED** |

### Wallet top-up (PART 12)

**WALLET TOP-UP E2E: BLOCKED** — Stripe not configured on Railway staging.

**Bug found:** Top-up button returned HTTP 500 (server action imported client analytics).  
**Fix:** `lib/lot-wallet/actions.ts` → `trackServerEvent()` with `entityId` (pending deploy on this branch).

### Buyer wallet checkout (PART 14–16)

| Scenario | Result |
|----------|--------|
| «Кошелёк ЛОТ» visible at checkout | ✅ visual |
| Full debit + order paid once | ⚠️ Not tested (0 ₽ demo balance, no top-up) |
| Insufficient funds UX | ⚠️ Not tested live |
| Seller revenue → buyer purchase | ⚠️ Not tested live |
| Payout withdrawable-only limit | ⚠️ UI visible; full admin lifecycle not E2E tested |

Evidence: `wallet-checkout.png`

---

## PART 18–21 — Promotion acceptance

| Gate | Result |
|------|--------|
| «Продвижение» for seller@demo.lot | ✅ |
| demo-new-seller / demo-growing / demo-problems | ✅ |
| `/account/promotion-center` Russian UI | ✅ |
| No raw «Promotion Center» / unexplained CTR/ROI | ✅ |
| `/account/business` — Деньги + Продвижение blocks | ✅ |
| Promotion wallet payment E2E | ❌ BLOCKED (no spendable balance / Stripe) |

Evidence: `promotion-center.png`  
Missing: `promotion-wallet-payment.png` (blocked)

---

## PART 22 — Ranking staging enablement & live search safety

`features/products/queries.ts` → `resolveOrderBy()` uses only `price`, `createdAt`, `views`, `favoritesCount`.  
**Does not consume advisory ranking score.** ✅

`/account/ranking` and `/admin/ranking` load when flag ON; at acceptance time flag was OFF on staging (shows disabled state).

---

## PART 23–43 — Ranking lab validation

Regenerated via `npm run ranking:lab:100`:

| Metric | Value |
|--------|-------|
| Products | 100 |
| Experiments | **50** |
| Dataset audit | `artifacts/ranking-lab/dataset-audit.json` |
| Product reports | 100 × `artifacts/ranking-lab/product-reports/` |
| TOP-10 explanation | in `experiment-results.json` |
| #11 gap explanation | in `experiment-results.json` |
| Simulation error | measured; `simulationErrorAcceptable: true` |

Quality checks (all pass):

```text
negativeControlsBlockedFromTop: true
badPromoCannotBuyTop: true
badPromoCannotBypassEligibility: true
reproducibilitySeed: 20260815
```

Known limitations documented:

- Trust/review **confidence by seller history** — partial; new-seller caveat in seller copy
- Query relevance vs card SEO quality — separated in lab matrix
- Cold-start neutral prior — documented in V1 candidate

Evidence: `seller-ranking.png`, `admin-ranking.png`, `ranking-top10-lab.png`

---

## PART 44–49 — Policies & activation gate

Updated:

- `docs/RANKING_FACTOR_INFLUENCE_REPORT.md`
- `docs/RANKING_V1_CANDIDATE.md`
- `docs/RANKING_V1_ACTIVATION_GATE.md`

**Live ranking remains OFF.** Manual sign-off required before any `resolveOrderBy()` change.

---

## Hard acceptance gates checklist

### Account UX

- [x] Profile duplication gone
- [x] Settings inline
- [x] No «Открыть» for basic profile fields
- [x] Password hidden by default
- [x] Eye toggle works
- [x] Actual save works (name field)
- [ ] Full password change E2E

### Wallet

- [x] Wallet visible
- [x] Top-up route visible
- [ ] Top-up E2E passed — **BLOCKED by Stripe**
- [ ] Buyer wallet payment E2E — **BLOCKED**
- [x] Seller revenue spendable (unit)
- [x] Seller revenue withdrawable (unit)
- [x] Top-up not withdrawable (unit)
- [x] Bonus not withdrawable (unit)
- [x] Pending funds protected (unit)
- [x] Payout uses withdrawable only (code + UI)
- [x] Unified history (visual)

### Promotion

- [x] «Продвижение» visible for all seller personas
- [x] Promotion Center one click away
- [x] Real metrics UI
- [ ] Wallet payment E2E — **BLOCKED**
- [ ] Promotion ledger entry E2E — **BLOCKED**

### Ranking

- [x] 100-product dataset audited
- [x] 50+ experiments
- [x] Query relevance separated from card quality
- [x] Negative controls blocked
- [x] Promotion cannot bypass gates
- [x] Promotion influence calibrated (0–15% sweep)
- [x] Review/trust confidence limitations documented
- [x] Cold start considered
- [x] TOP-10 explanation generated
- [x] #11 explanation generated
- [x] Per-product reports generated
- [x] Simulation error measured
- [x] V1 candidate updated
- [x] Live ranking remains OFF

---

## Automated test evidence (local, this branch)

```text
npm test tests/wallet.test.ts                    — 3 passed
npm test tests/wallet-topup.test.ts              — 2 passed
npm test tests/account-unification.test.ts       — 3 passed
npm test tests/ranking-100-products.test.ts      — 4 passed
npm run ranking:lab:100                          — 50 experiments, quality checks pass
npm run build                                    — success
```

---

## Remaining blockers before full financial ACCEPTED

1. Configure Stripe test keys on Railway staging (`STRIPE_SECRET_KEY`, webhook secret)
2. Deploy wallet top-up 500 fix (this branch)
3. Run wallet top-up → webhook → history E2E
4. Seed demo wallet balance for checkout / promotion pay scenarios
5. Enable `MARKETPLACE_RANKING_INTELLIGENCE_ENABLED=true` for staging advisory UX review
6. Activation gate manual sign-off (ranking live still blocked)

---

## Screenshot evidence index

| File | Content |
|------|---------|
| `settings-inline-desktop.png` | Inline profile fields |
| `settings-inline-mobile.png` | Mobile settings |
| `password-hidden.png` / `password-visible.png` | Password eye toggle |
| `wallet-overview.png` | Wallet tabs + balances |
| `wallet-topup.png` | Top-up form |
| `wallet-history.png` | Ledger history |
| `wallet-checkout.png` | Checkout wallet option |
| `promotion-center.png` | Seller promotion center |
| `seller-ranking.png` | Advisory ranking (flag off state) |
| `admin-ranking.png` | Admin ranking lab |
| `ranking-top10-lab.png` | Ranking advisory page |

Stored under `/opt/cursor/artifacts/` during acceptance run.
