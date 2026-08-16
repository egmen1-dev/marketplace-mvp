import { NextResponse } from "next/server";

import {
  requireAdminSession,
  AuthRequiredError,
  AdminRequiredError,
} from "@/features/auth";
import { listRemoteConfigEntries, setRemoteConfigEntry } from "@/lib/product-operations/remote-config";
import type { ProductOpsSurface } from "@prisma/client";

export async function GET() {
  try {
    await requireAdminSession();
  } catch (err) {
    if (err instanceof AuthRequiredError) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (err instanceof AdminRequiredError) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    throw err;
  }

  const entries = await listRemoteConfigEntries();
  return NextResponse.json({ entries });
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
    value: unknown;
    surface?: ProductOpsSurface;
  };

  if (!body.key) {
    return NextResponse.json({ error: "key required" }, { status: 400 });
  }

  const entry = await setRemoteConfigEntry({
    key: body.key,
    value: body.value,
    surface: body.surface ?? "MOBILE",
  });

  return NextResponse.json({ entry });
}
