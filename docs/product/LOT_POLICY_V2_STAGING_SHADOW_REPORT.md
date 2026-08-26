# LOT Policy V2 — Staging Shadow Report

**EPIC:** 190.2  
**Generated:** 2026-08-26T10:22:11.555Z  
**Mode:** SHADOW (no publication mutations)  
**Evaluation:** HTTP_FALLBACK  
**Staging SHA:** 135fdf8

## Sample

| Metric | Value |
|--------|-------|
| Real listings | 48 |
| Synthetic fixtures | 2 |
| Human reviewed | 0 |
| Human agreement | UNKNOWN — blind review not completed |

## Policy decisions

- **ALLOW**: 48
- **RESTRICTED_REVIEW**: 2

## Critical safety

| Metric | Count |
|--------|-------|
| Critical false negatives | UNKNOWN (UNKNOWN) |
| Hard false positives | 0 |
| Manual-review false positives | 0 |

## Image / OCR honesty

| Capability | Status |
|------------|--------|
| Pixel OCR | OPERATIONAL |
| QR | OPERATIONAL |
| Visual object classification | UNAVAILABLE |

## Latency / cost

- Median: 408ms
- P95: 3870ms
- Cache hit rate: 0.0%

## GUARDED_AUTO simulation

Eligible (conservative): 46 (95.8% of real sample)
Raw ALLOW (simulated): 46

## Automation verdict

**`NOT_READY_FOR_AUTOMATION`**

GUARDED_AUTO and ENFORCE remain **disabled**.

## RC10.5

**NOT_STARTED**
