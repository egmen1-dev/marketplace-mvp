import { NextResponse } from "next/server";

import {
  AuthRequiredError,
  requireSellerFromRequest,
  SellerRequiredError,
} from "@/features/auth/resolve-request-user";
import { getProductById, ProductServiceError, updateProduct } from "@/features/products/queries";
import { updateProductSchema } from "@/features/products/schemas";
import { ccosApiGuard } from "@/lib/ccos/api/guards";
import { withMobileApiContract } from "@/lib/mobile/api-contract";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const blocked = ccosApiGuard();
  if (blocked) return blocked;

  const { id } = await context.params;

  try {
    const seller = await requireSellerFromRequest(request);
    const existing = await getProductById(id, {
      userId: seller.userId,
      role: seller.role,
      sellerProfileId: seller.sellerProfileId,
    });
    if (!existing || existing.seller?.id !== seller.sellerProfileId) {
      return NextResponse.json({ error: "ЛОТ не найден" }, { status: 404 });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Ожидается JSON-тело запроса" }, { status: 400 });
    }

    const parsed = updateProductSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Ошибка валидации", issues: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const product = await updateProduct(id, seller.sellerProfileId, parsed.data);

    return NextResponse.json(
      withMobileApiContract({ product, message: "ЛОТ обновлён" }, `seller-product-patch-${id}`),
    );
  } catch (err) {
    if (err instanceof AuthRequiredError) {
      return NextResponse.json({ error: "Требуется вход" }, { status: 401 });
    }
    if (err instanceof SellerRequiredError) {
      return NextResponse.json({ error: "Нужен профиль продавца" }, { status: 403 });
    }
    if (err instanceof ProductServiceError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.status });
    }
    console.error("[PATCH /api/mobile/seller/products/:id]", err);
    return NextResponse.json({ error: "Не удалось обновить ЛОТ" }, { status: 500 });
  }
}
