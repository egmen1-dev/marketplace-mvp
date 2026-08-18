# Firebase Test Lab — operator run (P0 final validation)

Upload `/workspace/artifacts/epic-84-p0-startup/lot-android-alpha-0.1.5.apk`

**SHA256:** `a468413a232171708655b8543ae000baf9b2158615bd3066be68c3e430c0a5ed`

Device matrix (required — do not substitute):

- Model: Google Pixel 5 (`redfin`)
- API level: 30
- Locale: en_US
- Orientation: portrait

Test type: **Robo**

## Required artifacts (save here)

`/workspace/artifacts/epic-84-p0-startup/firebase-test-lab-015/`

- video
- screenshots
- logcat
- crash buffer
- test summary

## After PASS

```bash
FIREBASE_PROJECT_ID=<your-project> FIREBASE_TEST_LAB_RESULT=PASS npx tsx scripts/mobile-p0-firebase-test-lab.ts
```

## Expected logcat boot trail

`NATIVE_START → JS_BUNDLE_START → startup crash handlers installed → ROUTER_ENTRY → ROOT_LAYOUT_INIT → Home`

## Must NOT appear

- `NoClassDefFoundError: expo.modules.kotlin.types.AnyTypeProvider`
- `Cannot read property 'getGlobalHandler' of undefined`
