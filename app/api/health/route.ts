import { NextResponse } from "next/server";

import { getBuildVersionInfo } from "@/lib/build-info";
import { isBlobConfigured } from "@/lib/storage";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type CheckResult = {
  ok: boolean;
  optional?: boolean;
  detail?: string;
  configured?: boolean;
};

async function checkDatabase(): Promise<CheckResult> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { ok: true };
  } catch {
    return { ok: false, detail: "unreachable" };
  }
}

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

function stripeKeyPrefix(value: string | undefined, expected: string): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  return trimmed.startsWith(expected) ? expected : trimmed.slice(0, 8);
}

function stripeEnvironment(secretKey: string | undefined): "test" | "live" | "unknown" | null {
  const trimmed = secretKey?.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("sk_test_")) return "test";
  if (trimmed.startsWith("sk_live_")) return "live";
  return "unknown";
}

function checkStripe(): CheckResult & {
  apiKeyConfigured?: boolean;
  webhookSecretConfigured?: boolean;
  publishableKeyConfigured?: boolean;
  secretKeyPrefix?: string | null;
  publishableKeyPrefix?: string | null;
  environment?: "test" | "live" | "unknown" | null;
} {
  const secretRaw = process.env.STRIPE_SECRET_KEY?.trim();
  const webhookRaw = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  const publishableRaw = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.trim();
  const secret = Boolean(secretRaw);
  const webhook = Boolean(webhookRaw);
  const publishable = Boolean(publishableRaw);
  const configured = secret && webhook;
  const missing: string[] = [];
  if (!secret) missing.push("STRIPE_SECRET_KEY");
  if (!webhook) missing.push("STRIPE_WEBHOOK_SECRET");
  if (!publishable) missing.push("NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY");
  return {
    ok: secret,
    configured,
    optional: true,
    apiKeyConfigured: secret,
    webhookSecretConfigured: webhook,
    publishableKeyConfigured: publishable,
    secretKeyPrefix: stripeKeyPrefix(secretRaw, "sk_test_") ?? stripeKeyPrefix(secretRaw, "sk_live_"),
    publishableKeyPrefix:
      stripeKeyPrefix(publishableRaw, "pk_test_") ?? stripeKeyPrefix(publishableRaw, "pk_live_"),
    environment: stripeEnvironment(secretRaw),
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
 * Does not expose secrets or connection strings.
 */
export async function GET() {
  const [database] = await Promise.all([checkDatabase()]);

  const checks = {
    database,
    auth: checkAuth(),
    storage: checkStorage(),
    cron: checkCron(),
    stripe: checkStripe(),
  };

  const requiredOk = checks.database.ok && checks.auth.ok;
  const ok = requiredOk;

  return NextResponse.json(
    {
      ok,
      service: "marketplace-mvp",
      timestamp: new Date().toISOString(),
      version: getBuildVersionInfo(),
      checks,
    },
    { status: ok ? 200 : 503 },
  );
}
