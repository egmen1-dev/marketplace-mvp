# Release Feature Flag Matrix — Staging Rollout

**Updated:** 2026-08-15  
**Staging URL:** `https://web-production-e56fb.up.railway.app`  
**Staging SHA:** `b556424`

Legend:

| Staging | Meaning |
|---------|---------|
| ON | `=true` on Railway `web-v2` |
| OFF | Not set or `≠ true` |
| OPTIONAL | Safe to leave OFF until needed |
| DO_NOT_ENABLE | Not ready for production |

| Flag | Staging | Validated | Production recommendation |
|------|---------|-----------|---------------------------|
| `MARKETPLACE_TRUST_LOOP_ENABLED` | ON | ✅ Batch 1 | ON |
| `MARKETPLACE_TRUST_SCORE_MODEL_ENABLED` | ON | ✅ Batch 1 | ON |
| `MARKETPLACE_TRUST_EXPERIENCE_ENABLED` | ON | ✅ Batch 1 | ON |
| `MARKETPLACE_NEW_SELLER_TRUST_ENABLED` | ON | ✅ Batch 1 | ON |
| `MARKETPLACE_UX_COMPLETION_ENABLED` | ON | ✅ Batch 1 + 4 | ON |
| `MARKETPLACE_CONVERSION_ENABLED` | ON | ✅ Batch 1 + 4 | ON |
| `SELLER_FIRST_ENTRY_ENABLED` | ON | ✅ Batch 2 | ON |
| `SELLER_JOURNEY_ENABLED` | ON | ✅ Batch 2 | ON |
| `SELLER_OPERATING_DESK_ENABLED` | ON | ✅ Batch 2 | ON |
| `SELLER_OPERATIONS_ENABLED` | ON | ✅ Batch 2 | ON |
| `SELLER_BUSINESS_INTELLIGENCE_ENABLED` | ON | ✅ Batch 2 | ON |
| `SELLER_LIFECYCLE_ENABLED` | OFF | — | OPTIONAL |
| `SELLER_PAYOUT_ENABLED` | ON | ⚠️ Batch 3 UI only | ON (with manual provider until Stripe payout) |
| `MARKETPLACE_DELIVERY_ENABLED` | ON | ⚠️ Batch 3 admin; CDEK_MOCK | ON (mock OK for demo; real CDEK before commercial) |
| `MARKETPLACE_DISCOVERY_ENABLED` | ON | ✅ Batch 4 | ON |
| `DISCOVERY_DAILY_FINDS_ENABLED` | ON | ✅ Batch 4 | ON |
| `DISCOVERY_COLLECTIONS_ENABLED` | ON | ✅ Batch 4 | ON |
| `DISCOVERY_PRICE_GAME_ENABLED` | ON | ✅ Batch 4 | ON |
| `DISCOVERY_AI_CONTEXT_ENABLED` | ON | ✅ Batch 4 | ON |
| `MARKETPLACE_SOCIAL_GROWTH_ENABLED` | ON | ✅ Batch 4 | ON |
| `SOCIAL_SHARE_CARDS_ENABLED` | ON | ✅ Batch 4 | ON |
| `SOCIAL_COLLECTIONS_ENABLED` | ON | ✅ Batch 4 | ON |
| `SOCIAL_CREATOR_ENABLED` | ON | ✅ Batch 4 | ON |
| `MARKETPLACE_TRUST_CONVERSION_ENABLED` | OFF | — | OPTIONAL |
| `SELLER_PROMOTION_CENTER_ENABLED` | OFF | — | OPTIONAL (placeholder PR #38) |
| `MARKETPLACE_LAUNCH_READINESS_ENABLED` | ON | Admin only | OPTIONAL |
| `TRUST_SAFETY_ENABLED` | ON | ✅ Batch 1 | ON |
| `NEXT_PUBLIC_TRUST_SAFETY_ENABLED` | ON | ✅ Batch 1 | ON |
| `MARKETPLACE_DEPLOY_VISIBILITY_ENABLED` | default ON | ✅ | ON |

---

## Provider state (explicit)

| Integration | Staging state | Production gate |
|-------------|---------------|-----------------|
| Stripe checkout | Existing integration (not re-audited this rollout) | Must be verified separately |
| Seller payout | **Manual / admin processed** | Requires connected payout provider |
| CDEK delivery | **CDEK_MOCK** | Requires real CDEK credentials |
