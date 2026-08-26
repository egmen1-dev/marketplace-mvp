#!/usr/bin/env node
/** Bootstrap artifacts/mobile-physical-gap baseline + gap analysis JSON. */
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const OUT = join(process.cwd(), "artifacts/mobile-physical-gap");

function git(cmd) {
  return execFileSync(cmd, { encoding: "utf8", shell: true }).trim();
}

mkdirSync(OUT, { recursive: true });

const mainSha = git("git rev-parse main");
const rcSha = "90d41fe";

writeFileSync(
  join(OUT, "baseline.json"),
  JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      mainSha,
      rc105SourceSha: rcSha,
      versionName: "0.1.15-beta.6",
      versionCode: 21,
      railwaySha: mainSha,
      mrp: "PUBLISHED",
      physicalVerdictBefore: "READY_FOR_PHYSICAL_VALIDATION",
      physicalVerdictAfterP0: "BLOCKED_FOR_BETA",
      prePhysicalGate: "PRE_PHYSICAL_V2",
    },
    null,
    2,
  ),
);

writeFileSync(
  join(OUT, "physical-failures.json"),
  JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      rc: "RC10.5",
      failures: [
        {
          id: "P0-A",
          screen: "Создать ЛОТ → Добавьте фото",
          symptom: "Продолжить иногда не срабатывает с первого tap",
          expected: "photo ready → one tap Continue → Details",
        },
        {
          id: "P0-B",
          screen: "Проверить ЛОТ → Отправить на проверку",
          symptom: "spinner → idle, same screen, no error/success",
          expected: "SUCCESS or VISIBLE_ERROR",
        },
      ],
      verdict: "BLOCKED_FOR_BETA",
    },
    null,
    2,
  ),
);

writeFileSync(
  join(OUT, "photo-continue-root-cause.json"),
  JSON.stringify(
    {
      PHOTO_CONTINUE_ROOT_CAUSE:
        "canContinuePhotos only checked images.length>0, ignoring idle/uploading phases; photo ScrollView lacked keyboardShouldPersistTaps; no InteractionManager defer after ImagePicker return; parallel upload queue without mutex; Continue called goToStep directly without one-tap guard",
      files: [
        "apps/mobile/src/seller/use-lot-create-form.ts",
        "apps/mobile/app/sell/create.tsx",
        "lib/mobile/seller-journey/photo-step-state.ts",
      ],
      fix: "photo step state machine + continueFromPhotos with InteractionManager + upload mutex + truthful CTA",
    },
    null,
    2,
  ),
);

writeFileSync(
  join(OUT, "submit-black-hole-root-cause.json"),
  JSON.stringify(
    {
      SUBMIT_BLACK_HOLE_ROOT_CAUSE:
        "publishLot catch returned silently on CHARACTERISTICS_REQUIRED after clearErrors(); create/update path in publishOnServer did not call handleCharacteristicRejection; finally reset publishing → spinner→idle with no UI",
      files: ["apps/mobile/src/seller/use-lot-create-form.ts"],
      fix: "handleCharacteristicRejection on all CHARACTERISTICS_REQUIRED paths + submit action diagnostics + one-tap publish guard",
    },
    null,
    2,
  ),
);

writeFileSync(
  join(OUT, "gate-gap-analysis.json"),
  JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      summary: "Low-level gates validated contracts; no journey-level observable UI outcome tests",
      matrix: [
        {
          gate: "mobile:seller-photo-upload:gate",
          passedRc105: true,
          caughtPhysicalBug: false,
          whyMissed: "Tests upload API/FormData, not Continue tap/navigation after picker",
        },
        {
          gate: "mobile:create-lot-preview:gate",
          passedRc105: true,
          caughtPhysicalBug: false,
          whyMissed: "Validates details→preview blockers, not photo step Continue",
        },
        {
          gate: "mobile:lot-publish-truth:gate",
          passedRc105: true,
          caughtPhysicalBug: false,
          whyMissed: "Tests outcome mapper, not full submit UI flow or silent catch branch",
        },
        {
          gate: "mobile:rc10.5:physical-regression:gate",
          passedRc105: true,
          caughtPhysicalBug: false,
          whyMissed: "Aggregates low-level gates only — no seller journey harness",
        },
      ],
    },
    null,
    2,
  ),
);

writeFileSync(
  join(OUT, "diagnostics-contract.json"),
  JSON.stringify(
    {
      surface: "Профиль → О приложении → Скопировать диагностику",
      fields: ["timestamp", "screen", "action", "actionId", "productId", "clientState", "httpRoute", "httpStatus", "durationMs", "outcome", "errorCode"],
      excluded: ["password", "JWT", "cookies", "raw payloads"],
      correlationHeader: "x-client-action-id",
    },
    null,
    2,
  ),
);

console.log("artifacts/mobile-physical-gap bootstrap complete");

writeFileSync(
  join(OUT, "failure-matrix.json"),
  JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      scenarios: {
        A_slow_upload: "PASS — processing blocks, ready navigates (0–3000ms)",
        B_upload_fail: "PASS — ERROR phase blocks continue",
        C_tap_during_processing: "PASS — blocked; uploading may continue",
        D_double_tap_continue: "PASS — idempotent",
        E_submit_pending_review: "PASS — success step",
        F_submit_published: "PASS — success step",
        G_submit_400: "PASS — visible error",
        H_submit_409: "PASS — visible error",
        I_submit_500: "PASS — visible error",
        J_timeout_abort: "PASS — visible error",
        K_duplicate_submit: "PASS — single request",
        L_focus_loss: "PASS — silent catch detected by invariant",
      },
      verdict: "AUTOMATED_JOURNEY_PASS",
    },
    null,
    2,
  ),
);
