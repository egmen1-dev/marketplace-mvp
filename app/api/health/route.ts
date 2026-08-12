import { NextResponse } from "next/server";

import { isBlobConfigured } from "@/lib/storage";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type CheckResult = {
  ok: boolean;
  optional?: boolean;
  detail?: string;
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

function checkStripe(): CheckResult {
  const ok = Boolean(process.env.STRIPE_SECRET_KEY?.trim());
  return { ok, optional: true, detail: ok ? "configured" : "not_configured" };
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
      checks,
    },
    { status: ok ? 200 : 503 },
  );
}
