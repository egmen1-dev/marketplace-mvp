import { NextResponse } from "next/server";

import { requireAdminSession } from "@/features/auth";
import { getBlindShadowProductDetail } from "@/lib/moderation/staging-shadow/blind-review";

type RouteContext = { params: Promise<{ id: string }> };

/** Blind product view — no system recommendation before human decision. */
export async function GET(_request: Request, context: RouteContext) {
  await requireAdminSession();
  const { id } = await context.params;
  const product = await getBlindShadowProductDetail(id);
  if (!product) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }
  return NextResponse.json({ product, blindMode: true });
}
