import { NextResponse } from "next/server";

import { getSessionUser } from "@/features/auth";
import {
  CartServiceError,
  mergeGuestCartIntoUser,
} from "@/features/cart/queries";
import { mergeCartSchema } from "@/features/cart/schemas";

/**
 * POST /api/cart/merge
 * Merge guest localStorage items into the authenticated user's DB cart.
 * Body: { items: [{ productId, quantity }] }
 */
export async function POST(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Требуется вход" }, { status: 401 });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Ожидается JSON-тело запроса" },
        { status: 400 },
      );
    }

    const parsed = mergeCartSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Ошибка валидации", issues: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const cart = await mergeGuestCartIntoUser(user.id, parsed.data.items);
    return NextResponse.json(cart);
  } catch (err) {
    if (err instanceof CartServiceError) {
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: err.status },
      );
    }
    console.error("[POST /api/cart/merge]", err);
    return NextResponse.json(
      { error: "Не удалось объединить корзину" },
      { status: 500 },
    );
  }
}
