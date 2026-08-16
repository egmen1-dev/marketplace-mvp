import { NextResponse } from "next/server";

import { AdminRequiredError, AuthRequiredError, requireAdminSession } from "@/features/auth";
import { getCcosReadinessWithAudit } from "@/lib/ccos/rc";

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

  return NextResponse.json(getCcosReadinessWithAudit());
}
