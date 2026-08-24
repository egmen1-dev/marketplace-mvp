# Closed Beta RC10.1 — P0 Photo Upload Hotfix Build

**Candidate:** `0.1.15-beta.2` (versionCode `17`)  
**Status:** `READY_FOR_PHYSICAL_PHOTO_VALIDATION`  
**Recorded:** 2026-08-24

## Purpose

Minimal hotfix release after P0 seller photo upload fix (PR #168).

Physical scope: photo pick → upload → publish → buyer sees image.

## Version

| Field | Value |
|-------|-------|
| versionName | `0.1.15-beta.2` |
| versionCode | `17` |
| RC label | RC10.1 |
| Channel | CLOSED_BETA |
| Environment | staging |
| Previous | RC10 `0.1.15-beta.1` (code 16) |

## Gates

```bash
npm run build
npm run mobile:typecheck
npm run mobile:test
npm run mobile:seller-photo-upload:gate
npm run mobile:seller-photo-upload:smoke
npm run mobile:epic-159:gate
npm run release:pipeline:verify
npm run mobile:rc10.1:apk-verify
```

## Physical checklist

`artifacts/closed-beta-rc10.1/physical-checklist.json` — P0-A through P0-F only.

## Verdict

`READY_FOR_PHYSICAL_PHOTO_VALIDATION`
