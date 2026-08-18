import { NextResponse } from "next/server";

import { ccosApiGuard } from "@/lib/ccos/api/guards";
import { withMobileApiContract } from "@/lib/mobile/api-contract";
import { executeMobileSellerAction, type MobileSellerActionRequest } from "@/lib/mobile/seller-actions-data";
import type { SellerActionKind } from "@/lib/mobile/seller-home";

const ALLOWED: SellerActionKind[] = [
  "update_stock",
  "publish_product",
  "fix_moderation",
  "ship_order",
  "confirm_order",
  "reply_buyer",
  "withdraw_funds",
  "complete_profile",
  "resume_draft",
];

export async function POST(request: Request) {
  const blocked = ccosApiGuard();
  if (blocked) return blocked;

  let body: MobileSellerActionRequest;
  try {
    body = (await request.json()) as MobileSellerActionRequest;
  } catch {
    return NextResponse.json(
      withMobileApiContract({ ok: false, action: "update_stock", message: "Некорректный запрос" }, "mobile-seller-action-v1"),
      { status: 400 },
    );
  }

  if (!body?.action || !ALLOWED.includes(body.action)) {
    return NextResponse.json(
      withMobileApiContract(
        { ok: false, action: body?.action ?? "update_stock", message: "Действие не поддерживается", errorCode: "NOT_SUPPORTED" },
        "mobile-seller-action-v1",
      ),
      { status: 400 },
    );
  }

  const result = await executeMobileSellerAction(request, {
    action: body.action,
    payload: body.payload ?? {},
  });

  return NextResponse.json(withMobileApiContract(result, "mobile-seller-action-v1"), {
    status: result.ok ? 200 : 422,
  });
}
