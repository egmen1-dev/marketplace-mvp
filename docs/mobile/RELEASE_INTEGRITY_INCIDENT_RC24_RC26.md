# Release Integrity Incident — RC24 / RC25 / RC26

Concise record of historical Android Closed Beta release failures and RC26 remediation.

## code23 (0.1.15-beta.8 era)

| Field | Value |
|-------|-------|
| Boot | PASS |
| Updater discovery | PASS |
| Download | PASS |
| SHA verification | **FAIL** |
| Exact Android subtype | **Unprovable** |

**Why subtype is unprovable**

- Failed APK deleted immediately after verify failure
- Release build is non-debuggable (no run-as)
- Multiple failures collapse to `sha256_verify_failed`
- Actual SHA / byte size / Android subtype not logged at failure time

**RC26 change:** bounded-memory incremental SHA-256 (`FileHandle.readBytes`, 256 KiB chunks). No whole-file `ArrayBuffer` / WebCrypto verifier on device.

## code24 (0.1.15-beta.9)

| Field | Value |
|-------|-------|
| Boot | **FAIL** |
| Root cause | ExpoClipboard native registration mismatch |

**Mechanism**

- `package.json`: `expo-clipboard` declared
- APK JS bundle: Clipboard bytecode present
- `ExpoModulesPackageList` / native registration: **ExpoClipboardModule absent**
- JS required ExpoClipboard during route-tree startup → native lookup failed → crash before updater init

## code25 (0.1.15-beta.10)

| Field | Value |
|-------|-------|
| Boot | **FAIL** (same ExpoClipboard mismatch) |
| Additional | Historical native `onProgress` regression in downloader (fixed before RC26) |

## code26 (0.1.15-beta.11) — canonical published

| Field | Value |
|-------|-------|
| Autonomous boot | PASS (Mac acceptance) |
| Server delivery | Byte-identical GitHub Raw → MRP → Railway proxy |
| Canonical SHA | `cbc3c75d5967241f15a19a01519bf617bd6119da11d6748da0d9015dc8334cd4` |
| Chunked verifier | Present |
| Updater 8 KiB hang | Not reproduced on v23 download path |

## NOT yet validated

**RC26 → RC27 published self-update E2E** has **NOT** passed:

```text
published RC26 → published RC27 → in-app download → SHA → installer → system update
```

This remains a required future physical gate.

## Prevention — Release Integrity Gate

Run before every CLOSED_BETA publish:

```bash
npm run mobile:release-integrity:gate -- <apk-path> <build-manifest.json>
```

On Mac (after static gate PASS):

```bash
./scripts/mobile-native-release-boot-gate.sh <apk-path>
NATIVE_AVD_GATE_RESULT=PASS npm run mobile:release-integrity:gate -- <apk-path> <manifest>
```

After publish:

```bash
node scripts/rc{N}-update-api-verification.mjs
SERVER_DELIVERY_GATE_RESULT=PASS npm run mobile:release-integrity:gate -- ...
```
