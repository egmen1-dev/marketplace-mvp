import { NextResponse } from "next/server";

import { getSessionUser } from "@/features/auth";
import {
  addToCart,
  CartServiceError,
  getCartForUser,
  removeFromCart,
  updateCartItemQuantity,
} from "@/features/cart/queries";
import {
  addToCartSchema,
  updateCartItemSchema,
} from "@/features/cart/schemas";

async function requireUserId(): Promise<
  { userId: string } | { response: NextResponse }
> {
  const user = await getSessionUser();
  if (!user) {
    return {
      response: NextResponse.json({ error: "Требуется вход" }, { status: 401 }),
    };
  }
  return { userId: user.id };
}

function handleCartError(err: unknown, context: string) {
  if (err instanceof CartServiceError) {
    return NextResponse.json(
      { error: err.message, code: err.code },
      { status: err.status },
    );
  }
  console.error(context, err);
  return NextResponse.json(
    { error: "Не удалось обработать корзину" },
    { status: 500 },
  );
}

/** GET /api/cart — current user's cart with products and totals. */
export async function GET() {
  try {
    const auth = await requireUserId();
    if ("response" in auth) return auth.response;

    const cart = await getCartForUser(auth.userId);
    return NextResponse.json(cart);
  } catch (err) {
    return handleCartError(err, "[GET /api/cart]");
  }
}

/** POST /api/cart — add item (increments if exists). Body: { productId, quantity? } */
export async function POST(request: Request) {
  try {
    const auth = await requireUserId();
    if ("response" in auth) return auth.response;

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Ожидается JSON-тело запроса" },
        { status: 400 },
      );
    }

    const parsed = addToCartSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Ошибка валидации", issues: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const cart = await addToCart(
      auth.userId,
      parsed.data.productId,
      parsed.data.quantity,
    );
    return NextResponse.json(cart, { status: 201 });
  } catch (err) {
    return handleCartError(err, "[POST /api/cart]");
  }
}

/** PATCH /api/cart — set quantity. Body: { productId, quantity } (0 removes). */
export async function PATCH(request: Request) {
  try {
    const auth = await requireUserId();
    if ("response" in auth) return auth.response;

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Ожидается JSON-тело запроса" },
        { status: 400 },
      );
    }

    const parsed = updateCartItemSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Ошибка валидации", issues: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const cart = await updateCartItemQuantity(
      auth.userId,
      parsed.data.productId,
      parsed.data.quantity,
    );
    return NextResponse.json(cart);
  } catch (err) {
    return handleCartError(err, "[PATCH /api/cart]");
  }
}

/** DELETE /api/cart?productId=… — remove one line. */
export async function DELETE(request: Request) {
  try {
    const auth = await requireUserId();
    if ("response" in auth) return auth.response;

    const productId = new URL(request.url).searchParams.get("productId");
    if (!productId) {
      return NextResponse.json(
        { error: "Укажите productId" },
        { status: 400 },
      );
    }

    const cart = await removeFromCart(auth.userId, productId);
    return NextResponse.json(cart);
  } catch (err) {
    return handleCartError(err, "[DELETE /api/cart]");
  }
}
