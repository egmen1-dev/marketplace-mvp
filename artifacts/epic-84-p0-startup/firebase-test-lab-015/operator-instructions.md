# Firebase Test Lab — operator run

Upload `/workspace/apps/mobile/android/app/build/outputs/apk/release/app-release.apk` (SHA256: 0b2c02e6ab6a0f2c9652ae2318ee0c378f5a4b736d3382a9ccbf235921b38aef) to Firebase Test Lab.

Device matrix (required first):
- Model: Google Pixel 5 (`redfin`)
- API level: 30
- Locale: en_US
- Orientation: portrait

Test type: Robo

After run, save logcat + crash artifacts to:
`/workspace/artifacts/epic-84-p0-startup/firebase-test-lab-015`

Then re-run with results:
`FIREBASE_TEST_LAB_RESULT=PASS npx tsx scripts/mobile-p0-firebase-test-lab.ts`
