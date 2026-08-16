# CCOS Brain Maturity Model

## Levels

| Level | Capabilities |
|---|---|
| L1_OBSERVER | observe |
| L2_ADVISOR | observe, recommend |
| L3_SIMULATOR | observe, recommend, simulate |
| L4_AUTOPILOT | observe, recommend, simulate, execute (with human confirmation) |

## Wave 0 assignment

- **CCOS Observation layer**: `L1_OBSERVER`
- **Marketplace Brain**: `L2_ADVISOR`
- **Autopilot**: disabled — `denyAutopilotExecution()` / execute always denied

## Guards

- `assertBrainCapability(level, capability)` — boolean check
- `requireBrainCapability(level, capability)` — throws if denied
- `assertAdvisoryReport()` — cognitive reports must set `advisoryOnly: true` in Wave 0

## Financial & moderation hard guards

CCOS never executes:

- wallet debit / payout / refund / promotion purchase
- moderation enforcement (hide product, block seller)

It may explain and mirror existing gate state.

## UI maturity

Seller sees 「Интеллект карточки」 / 「Профиль карточки」 — not raw publisher debug.

Admin cognitive route shows genome, observations, publisher health, provenance.

## Promotion to higher maturity

Requires Wave 1+ acceptance: simulation harness, experiment registry, human approval workflow — not Wave 0.
