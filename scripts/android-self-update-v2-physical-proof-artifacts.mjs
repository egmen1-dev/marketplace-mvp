#!/usr/bin/env node
/** Physical proof artifact bootstrap — NOT_RUN until real device test. */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const OUT = join(process.cwd(), "artifacts/android-self-update-v2-physical-proof");
mkdirSync(OUT, { recursive: true });

const baseline = {
  generatedAt: new Date().toISOString(),
  epic: "Android Self-Update V2 Physical Proof Release",
  merge: {
    pr208: "merged",
    selfUpdateV2MergeSha: "d78f902b64aaed045a556009ec513de7dc0f5c45",
    mainSha: "e062f772ac669d55d321c2c620efa04002ea17b2",
  },
  releaseNumbers: {
    bootstrap: { rc: "RC10.8", versionName: "0.1.15-beta.9", versionCode: 24 },
    target: { rc: "RC10.9", versionName: "0.1.15-beta.10", versionCode: 25 },
  },
  forensicBaseline: {
    HTTP_REQUEST_FROM_DEVICE: "YES",
    NETWORK_DOWNLOAD_SUCCESS: "PROVEN",
    POST_DOWNLOAD_FAILURE: "PROVEN",
    RC10_5_REMOTE_RECOVERY: "FAILED",
  },
  expectedSignerSha256: "fac61745dc0903786fb9ede62a962b399f7348f0bb6f899b8332667591033b9c",
  physicalProofContract: "BOOTSTRAP_FIXED_RC → in-app updater V2 → NEXT_FIXED_RC",
};

writeFileSync(join(OUT, "baseline.json"), JSON.stringify(baseline, null, 2));
writeFileSync(join(OUT, "physical-proof.json"), JSON.stringify({ status: "NOT_RUN" }, null, 2));
writeFileSync(join(OUT, "physical-checklist.json"), JSON.stringify({
  status: "NOT_RUN",
  sections: ["A_BOOTSTRAP", "B_CLEAN_UPDATE_CHECK", "C_DOWNLOAD", "D_VERIFY", "E_INSTALLER", "F_TARGET_INSTALLED", "G_POST_INSTALL", "H_DIAGNOSTICS", "I_SELLER_PHOTO", "J_SELLER_PREVIEW", "K_SELLER_SUBMIT", "L_MY_LOTS"],
  note: "See docs/mobile/EPIC_ANDROID_SELF_UPDATE_V2_PHYSICAL_CHECKLIST.md",
}, null, 2));

console.log(`[OK] ${OUT}`);
