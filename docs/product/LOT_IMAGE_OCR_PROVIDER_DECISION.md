# LOT Image / OCR Provider Decision

**EPIC:** 189.1  
**Date:** 2026-08-26  
**Status:** Implemented (Tesseract + pixel composite)

---

## Requirements

| Requirement | Weight |
|-------------|--------|
| Cyrillic + Latin OCR on product packaging | Critical |
| Mixed-script labels (mg/ml, NICOTINE, бренды) | Critical |
| Server-side only (no client secrets) | Critical |
| QR / contact detection in images | High |
| Visual product class detection (vape, alcohol, weapons) | High |
| Latency suitable for async moderation pipeline | High |
| Operable from Railway/Vercel Node runtime | High |
| Predictable cost at Closed Beta scale | Medium |

---

## Options evaluated

| Provider | OCR RU/Cyr | Image CV | Latency | Cost | Railway fit | Privacy |
|----------|------------|----------|---------|------|-------------|---------|
| **Tesseract.js (local)** | Good with `rus+eng` | No | 1–4s/image | CPU only | Excellent | Data stays in LOT |
| Google Cloud Vision | Excellent | Excellent | ~0.5–2s | Per-image API | Good (credentials) | Images sent to Google |
| AWS Textract + Rekognition | Good | Good | ~1–3s | Per-image API | Good | Images sent to AWS |
| Yandex Vision | Excellent RU | Good | ~1–2s | Per-image API | Good | Images sent to Yandex |
| URL/alt heuristics only | N/A | **Not pixel** | Instant | Free | N/A | **Rejected** |

---

## Decision

### OCR provider (operational)

**Primary:** `TesseractOcrProvider` (`tesseract.js` 5.x, traineddata `rus+eng`)

- Processes **actual image bytes** (via `sharp` preprocess: rotate, resize ≤1600px, PNG)
- Provider-neutral `OcrResult` contract with `EVALUATED | FAILED | TIMEOUT | UNAVAILABLE`
- Cached by SHA256 image hash + provider version + policy engine version

**Optional future:** `GoogleCloudVisionOcrProvider` when `GOOGLE_CLOUD_VISION_ENABLED=true` for higher accuracy on low-contrast labels.

### Image moderation provider (operational — partial)

**Primary:** `PixelCompositeImageModerationProvider`

| Capability | Method | Status |
|------------|--------|--------|
| QR code detection | `jsqr` on pixel buffer | **EVALUATED** |
| Contact/URL/Telegram in image text | OCR-derived policy signals | **EVALUATED** |
| Nicotine/vape/alcohol keywords on packaging | OCR-derived policy signals | **EVALUATED** |
| Visual object classification (bottle shape, device photo without text) | — | **UNAVAILABLE** without cloud CV |

**Optional future:** `GoogleCloudVisionImageProvider` for label detection / safe search when credentials configured.

---

## Cost model (Closed Beta estimate)

| Item | Assumption | Estimate |
|------|------------|----------|
| OCR CPU | ~2s × 3 images/LOT | ~6s CPU/LOT |
| Cache hit rate (re-list same photos) | 30–50% after warmup | −30–50% CPU |
| Cloud Vision (if enabled later) | $1.50 / 1k images | ~$0.0045/LOT (3 images) |

At 1,000 moderated LOTs/month without cache: ~6,000s CPU ≈ acceptable on single worker; cache strongly recommended.

---

## Privacy / security

- Default path: images fetched server-side from Vercel Blob (Bearer token for private URLs); **not sent to third parties**
- Provider credentials via env vars only (`BLOB_READ_WRITE_TOKEN`, optional `GOOGLE_APPLICATION_CREDENTIALS`)
- Audit logs record provider status/latency — not full OCR text in production logs
- OCR evidence stored in `policyV2Snapshot` / `imageEvaluationSummary` for moderator review

---

## Limitations (honest)

- Tesseract accuracy drops on: very small text, heavy rotation, low contrast, stylized fonts
- Visual vape/device detection without readable text requires cloud CV — not claimed as operational
- QR without successful decode may be missed; adversarial tests document gaps

---

## Rationale

Tesseract + pixel QR/OCR-bridge delivers **truthful pixel OCR** without external API dependency for Closed Beta, while keeping provider interfaces ready for Google Vision upgrade where accuracy-critical.
