import { NextResponse } from "next/server";

import { AdminRequiredError, AuthRequiredError, requireAdminSession } from "@/features/auth";
import { buildEvolutionReadinessReport } from "@/lib/ccos/evolution/readiness";
import { runCcosDependencyAudit } from "@/lib/ccos/rc/dependency-audit";

export async function GET() {
  try {
    await requireAdminSession();
  } catch (err) {
    if (err instanceof AuthRequiredError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (err instanceof AdminRequiredError) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    throw err;
  }

  const report = buildEvolutionReadinessReport({ dependencyAudit: runCcosDependencyAudit() });
  return NextResponse.json({
    ready: report.ready,
    checks: report.checks,
    productionPromotionDisabled: report.productionPromotionDisabled,
    versionPointers: report.versionPointers,
    shadowEvaluationContract: report.shadowEvaluationContract,
    evaluatedAt: report.evaluatedAt,
  });
}
