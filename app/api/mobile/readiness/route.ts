import { NextResponse } from "next/server";

import { ccosApiGuard } from "@/lib/ccos/api/guards";
import {
  withMobileApiContract,
  MOBILE_API_VERSION,
  MOBILE_SCHEMA_VERSION,
  MOBILE_DEEP_LINK_SCHEME,
  APK_UPDATE_METADATA,
} from "@/lib/mobile/api-contract";
import { runReleaseReadinessCheck } from "@/lib/mobile/release-readiness";
import { buildAppShellReadinessReport } from "@/lib/mobile/app-shell-readiness";
import { buildMobileAuthDecisionReport } from "@/lib/mobile/auth-decision";
import { evaluateNativeAppShellStartGate } from "@/lib/mobile/native-shell-gate";
import { buildCognitiveCapabilitiesManifest } from "@/lib/mobile/cognitive-capabilities";
import { buildBrainCompatibilityFields } from "@/lib/mobile/brain-compatibility";
import { MOBILE_PAGINATION_CONTRACT } from "@/lib/mobile/error-contract";

/**
 * Release Readiness Checklist
 * GET /api/mobile/readiness
 */
export async function GET() {
  const blocked = ccosApiGuard();
  if (blocked) return blocked;

  const report = runReleaseReadinessCheck();
  const appShell = buildAppShellReadinessReport();
  const authDecision = buildMobileAuthDecisionReport();
  return NextResponse.json(
    withMobileApiContract(
      {
        ...report,
        appReadiness: report.ready ? "READY" : "NOT_READY",
        appShellReadiness: appShell.status,
        appShellBlockers: appShell.blockers,
        authDecision: authDecision.decision,
        authNativeReady: authDecision.nativeAppReady,
        nativeAppShellStart: evaluateNativeAppShellStartGate().status,
        cognitiveCapabilities: buildCognitiveCapabilitiesManifest(),
        brainCompatibility: buildBrainCompatibilityFields(),
        errorContractVersion: "mobile-error-v1",
        paginationContract: MOBILE_PAGINATION_CONTRACT,
        apiContract: {
          apiVersion: MOBILE_API_VERSION,
          schemaVersion: MOBILE_SCHEMA_VERSION,
        },
        deepLinkScheme: MOBILE_DEEP_LINK_SCHEME,
        apkUpdateMetadata: APK_UPDATE_METADATA,
      },
      report.evaluatedAt,
    ),
  );
}
