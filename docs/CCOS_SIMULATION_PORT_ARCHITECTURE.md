# CCOS Simulation Port Architecture

EPIC-77-PRE-WAVE-6 — universal ranking simulation boundary.

## Problem

RC-1 found **11 marketplace imports** inside `lib/ccos/twin/*` (shadow ranking). This violated the CCOS invariant:

```text
lib/ccos MUST NOT know Marketplace internals
```

## Solution

Extract a universal port inside CCOS; implement marketplace logic in an adapter outside CCOS.

## Data flow

```text
Marketplace Ranking (shadow-ranking, ranking-intelligence)
        ↓
lib/marketplace-cognitive-platform/adapters/ranking-simulation.adapter.ts
        ↓
RankingSimulationPort (lib/ccos/simulation)
        ↓
Twin simulation (lib/ccos/twin/simulation.ts)
        ↓
TwinDecisionReport
```

## Core contracts

- `RankingSimulationPort` — `lib/ccos/simulation/types.ts`
- Registry — `registerSimulationPort()` / `getSimulationPort()` / `requireSimulationPort()`
- Timeout wrapper — `evaluateSimulationWithTimeout()` (8s default)
- Shared scenario types — `lib/ccos/contracts/scenario.ts`

## Provenance (required)

Every simulation result includes:

```text
source.app
source.module
source.version
source.portId
```

Twin surfaces this as `portProvenance` on each scenario result.

## Failure isolation

| Failure | Twin behaviour |
|---|---|
| Port throws | `simulationStatus = DEGRADED`, `failedPort` set |
| Port timeout | `simulationStatus = TIMEOUT`, `retryable = true` |
| Invalid binding | DEGRADED — no system-wide 500 |

Other ports (future multi-port) can continue when one degrades.

## Confidence aggregation

Twin confidence is capped by:

```text
min(rawTwinConfidence, graphPropagatedConfidence × 1.05, simulationPortConfidence × 1.05)
```

## Cross-app readiness

Future ports (no CCOS Core changes required):

- `marketplace-ranking-simulation` (implemented)
- `daos-design-simulation` (contract-ready)
- `quicksale-seller-simulation` (contract-ready)
- `pricing-simulation` (contract-ready)
- `advertising-simulation` (contract-ready)

## Graph → Twin boundary

```text
Knowledge Graph → TwinState → Simulation Ports → Scenario Result → Decision Comparison
```

Graph does not reference simulation provider implementations.
