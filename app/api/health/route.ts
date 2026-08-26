import { NextResponse } from "next/server";

import { checkSchemaCompatibility } from "@/lib/db/schema-compatibility";
import { getBuildVersionInfo } from "@/lib/build-info";
import { getModerationAutomationMode, isLotPolicyV2ShadowEnabled } from "@/lib/moderation/config";
import { isImageModerationOperational, isOcrOperational } from "@/lib/moderation/providers";
import { isMarketplaceTrustLoopEnabled } from "@/lib/marketplace-trust-loop/flags";
import { isBlobConfigured } from "@/lib/storage";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type CheckResult = {
  ok: boolean;
  optional?: boolean;
  detail?: string;
  configured?: boolean;
  reachable?: boolean;
  schemaCompatible?: boolean;
  missingColumns?: string[];
  missingTables?: string[];
  epic174MigrationApplied?: boolean | null;
};

function checkAuth(): CheckResult {
  const ok = Boolean(process.env.AUTH_SECRET?.trim());
  return ok ? { ok: true } : { ok: false, detail: "AUTH_SECRET missing" };
}

function checkStorage(): CheckResult {
  const ok = isBlobConfigured();
  return { ok, optional: true, detail: ok ? "configured" : "not_configured" };
}

function checkCron(): CheckResult {
  const ok = Boolean(process.env.CRON_SECRET?.trim());
  return { ok, optional: true, detail: ok ? "configured" : "not_configured" };
}

function checkStripe(): CheckResult {
  const secret = Boolean(process.env.STRIPE_SECRET_KEY?.trim());
  const webhook = Boolean(process.env.STRIPE_WEBHOOK_SECRET?.trim());
  const publishable = Boolean(
    process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.trim(),
  );
  const configured = secret && webhook;
  const missing: string[] = [];
  if (!secret) missing.push("STRIPE_SECRET_KEY");
  if (!webhook) missing.push("STRIPE_WEBHOOK_SECRET");
  if (!publishable) missing.push("NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY");
  return {
    ok: secret,
    configured,
    optional: true,
    detail: configured
      ? "configured"
      : secret
        ? `partial (${missing.join(", ")})`
        : "not_configured",
  };
}

/**
 * Health check — safe for load balancers / Railway.
 * GET /api/health
 *
 * Distinguishes DB reachability from schema compatibility.
 * Does not expose secrets or connection strings.
 */
export async function GET() {
  const schema = await checkSchemaCompatibility();

  const database: CheckResult = {
    ok: schema.reachable && schema.compatible,
    reachable: schema.reachable,
    schemaCompatible: schema.compatible,
    detail: schema.detail,
    missingColumns: schema.missingColumns,
    missingTables: schema.missingTables,
    epic174MigrationApplied: schema.epic174MigrationApplied,
  };

  const checks = {
    database,
    auth: checkAuth(),
    storage: checkStorage(),
    cron: checkCron(),
    stripe: checkStripe(),
  };

  const requiredOk =
    checks.database.reachable === true &&
    checks.database.schemaCompatible === true &&
    checks.auth.ok;

  return NextResponse.json(
    {
      ok: requiredOk,
      service: "marketplace-mvp",
      timestamp: new Date().toISOString(),
      version: getBuildVersionInfo(),
      runtime: {
        trustLoopEnabled: isMarketplaceTrustLoopEnabled(),
        moderationAutomationMode: getModerationAutomationMode(),
        policyV2Shadow: isLotPolicyV2ShadowEnabled(),
        ocr: isOcrOperational() ? "operational" : "unavailable",
        imageModeration: isImageModerationOperational() ? "operational" : "unavailable",
      },
      checks,
    },
    { status: requiredOk ? 200 : 503 },
  );
}
