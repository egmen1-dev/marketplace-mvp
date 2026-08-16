import { NextResponse } from "next/server";

import {
  requireAdminSession,
  AuthRequiredError,
  AdminRequiredError,
} from "@/features/auth";
import { listProductFlags, setProductFlag } from "@/lib/product-operations/feature-flags";
import type { ProductFlagStage } from "@prisma/client";

export async function GET() {
  try {
    await requireAdminSession();
  } catch (err) {
    if (err instanceof AuthRequiredError) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (err instanceof AdminRequiredError) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    throw err;
  }

  const flags = await listProductFlags();
  return NextResponse.json({ flags });
}

export async function POST(request: Request) {
  try {
    await requireAdminSession();
  } catch (err) {
    if (err instanceof AuthRequiredError) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (err instanceof AdminRequiredError) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    throw err;
  }

  const body = (await request.json()) as {
    key: string;
    stage: ProductFlagStage;
    enabled: boolean;
    notes?: string;
  };

  if (!body.key || !body.stage) {
    return NextResponse.json({ error: "key and stage required" }, { status: 400 });
  }

  const flag = await setProductFlag({
    key: body.key,
    stage: body.stage,
    enabled: body.enabled ?? false,
    notes: body.notes,
  });

  return NextResponse.json({ flag });
}
