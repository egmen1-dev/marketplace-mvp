# Trust & Risk platform (AGENT-019)

A standalone trust, reputation and anti-fraud platform for LOT. **Analysis-first**:
it scores, records events and recommends — it does **not** auto-block real user
actions. Enforcement is off by default (`RISK_ENFORCEMENT_ENABLED=false`, section 56/57).

Module: `features/trust-risk/`. Trust and fraud-risk are **separate** — high trust
does not zero out per-operation risk.

## Subsystems

| Piece | File | Role |
| --- | --- | --- |
| TrustScoreEngine | `trust-engine.ts` | Seller/Buyer operational trust 0–100, explainable, neutral priors |
| RiskScoreEngine | `risk-engine.ts` | Product/Transaction risk 0–100, combination-based |
| Detectors | `detectors/*` | Price outlier, duplicate listing, self-deal, rate/burst |
| RuleEngine | `rule-engine.ts` | Code-config rules → effect (mostly LOG_ONLY / ADMIN_REVIEW) |
| RiskEventService | `risk-event-service.ts` | Idempotent `recordRiskSignal`, admin resolution + audit, reads |
| ReputationService | `reputation.ts` | Precompute `UserTrustStats` / `SellerTrustStats` / `ProductRiskStats` |
| Scan | `scan.ts` | Batch detector run → idempotent events + stats |
| Detail | `detail.ts` | Live explainability for admin entity pages |

## Data model (self-contained)

`RiskEvent`, `RiskAuditLog`, `UserTrustStats`, `SellerTrustStats`, `ProductRiskStats`.
Entities are referenced by **opaque id** (no Prisma relations to Order/other
models) so the platform never touches CORE-060's Order schema/state machine
(parallel-development safe, section 60). Integration is an event contract.

## Event-driven integration

`recordRiskSignal(db, signal)` is the ingestion point. It is **idempotent** via
`sourceEventId` (repeated domain-event delivery creates one event, section 28).
Sources: PRODUCTS, ORDERS, REVIEWS, RESERVATIONS, CHAT, AUTH, SYSTEM. Order events
(ORDER_CREATED/…/RETURNED) are consumed via the adapter without owning statuses.

## Ranking integration (capped)

`ProductRiskStats.riskScore` maps to a capped ranking penalty (LOW 0, MEDIUM 0.03,
HIGH 0.10, CRITICAL 0.20; hard cap 0.25) applied to the final score — risk never
dominates ranking (sections 36/37). New sellers/products get neutral priors.

## Admin workflow

`/admin/risk` (ADMIN only): counters, filters, scan, event list with resolution
(reviewed / confirm / dismiss / escalate). `/admin/risk/{user,seller,product}/[id]`:
trust/risk score + **explainability** (per-signal deltas) + events. Events are never
hard-deleted; every resolution writes a `RiskAuditLog`.

## False-positive & privacy safety

- Low-confidence detectors stay LOG_ONLY (section 40).
- No protected/sensitive traits (gender/race/religion/politics/health/precise
  location) — section 42.
- `RiskEvent.metadata` holds only technical, non-PII data (section 43).
- Internal trust/risk scores are never exposed to buyers/sellers; only safe public
  badges/aggregates remain (sections 34/35).

## Security

Admin risk routes are ADMIN-gated (`requireAdminSession` via the admin layout).
Resolution/scan server actions re-check `role === ADMIN`. No IDOR: sellers/buyers
cannot read internal risk data.

See also `docs/RISK_RULES.md`, `docs/TRUST_SCORING.md`, `docs/AGENT_019_TRUST_AUDIT.md`.
