# LOT Policy V2 — Staging Shadow Report

**EPIC:** 190.1  
**Generated:** 2026-08-26T09:43:07.162Z  
**Mode:** SHADOW (no publication mutations)  
**Evaluation:** HTTP_FALLBACK  
**Staging SHA:** 135fdf8

## Sample

| Metric | Value |
|--------|-------|
| Real listings | 50 |
| Synthetic fixtures | 0 |
| Human agreement | NOT_RUN (no DATABASE_URL human records) |

## Policy decisions

- **ALLOW**: 44
- **HARD_BLOCK**: 4
- **RESTRICTED_REVIEW**: 2

## Critical safety

| Metric | Count |
|--------|-------|
| Critical false negatives | 0 |
| Hard false positives | 0 |
| Manual-review false positives | 0 |

## Image / OCR honesty

| Capability | Status |
|------------|--------|
| Pixel OCR | OPERATIONAL |
| QR | OPERATIONAL |
| Visual object classification | UNAVAILABLE |

## Latency / cost

- Median: 407ms
- P95: 3889ms
- Cache hit rate: 0.0%

## GUARDED_AUTO simulation

Eligible: 44 (88.0% of real sample)

## Automation verdict

**`NOT_READY_FOR_AUTOMATION`**

GUARDED_AUTO and ENFORCE remain **disabled**.

## RC10.5

**NOT_STARTED**
