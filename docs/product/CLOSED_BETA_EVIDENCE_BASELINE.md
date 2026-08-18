# Closed Beta Evidence Baseline

## Policy

Closed Beta **release metrics** (readiness dashboard, exit report, crash observatory, journey validation, release gates) use only:

1. Events **on or after** the evidence baseline timestamp
2. Events with eligible source `REAL_USER` (not `VALIDATION` or `AUTOMATED_TEST`)

Pre-baseline EPIC 102–108 validation probes remain in the database for audit but are **excluded** from release sign-off metrics.

## Baseline

| Field | Value |
|-------|-------|
| Commit | `74abf11` |
| Effective at (UTC) | `2026-08-18T14:55:59.828Z` |
| Railway deploy | First successful Closed Beta stack after EPIC 102–109 merge |

## Source classification

| Source | Meaning | In release metrics? |
|--------|---------|---------------------|
| `REAL_USER` | Production/staging user or operator session | Yes (if after baseline) |
| `VALIDATION` | EPIC gate probes, controlled crash harness | No |
| `AUTOMATED_TEST` | Scripted E2E / CI probes | No |

Inference uses explicit `metadata.evidenceSource`, validation markers (`epic103`, `epic108_gate`), screens, session/device prefixes, and `BETA_VALIDATION_CONTROLLED_CRASH`.

## Journey semantics

| Sample sessions | Verdict |
|-----------------|---------|
| `< 3` | `INSUFFICIENT_DATA` (not FAIL) |
| `≥ 3` with low completion | `FAIL` or `PASS` per thresholds |

`0%` with zero eligible sessions is **never** treated as failure.

## Implementation

`lib/product-operations/beta/evidence-eligibility.ts`
