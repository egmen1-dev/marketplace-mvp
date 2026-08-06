import { NextResponse } from "next/server";

import {
  AuthRequiredError,
  getSessionUser,
  requireSellerSession,
  SellerRequiredError,
} from "@/features/auth";
import {
  deleteProduct,
  getProductById,
  ProductServiceError,
  updateProduct,
} from "@/features/products/queries";
import { updateProductSchema } from "@/features/products/schemas";

type RouteContext = {
  params: Promise<{ id: string }>;
};

/**
 * GET /api/products/[id]
 * Product detail — ACTIVE for anonymous; owner seller / admin may see drafts etc.
 */
export async function GET(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    if (!id) {
      return NextResponse.json({ error: "id обязателен" }, { status: 400 });
    }

    const session = await getSessionUser();
    const product = await getProductById(
      id,
      session
        ? {
            userId: session.id,
            role: session.role,
            sellerProfileId: session.sellerProfileId,
          }
        : null,
    );
    if (!product) {
      return NextResponse.json({ error: "Товар не найден" }, { status: 404 });
    }

    return NextResponse.json(product);
  } catch (err) {
    console.error("[GET /api/products/:id]", err);
    return NextResponse.json(
      { error: "Не удалось получить товар" },
      { status: 500 },
    );
  }
}

/**
 * PATCH /api/products/[id]
 * Update owned product. Requires seller session.
 */
export async function PATCH(request: Request, context: RouteContext) {
  try {
    let sellerProfileId: string;
    try {
      const seller = await requireSellerSession();
      sellerProfileId = seller.sellerProfileId;
    } catch (err) {
      if (err instanceof AuthRequiredError) {
        return NextResponse.json({ error: "Требуется вход" }, { status: 401 });
      }
      if (err instanceof SellerRequiredError) {
        return NextResponse.json(
          { error: "Нужен профиль продавца" },
          { status: 403 },
        );
      }
      throw err;
    }

    const { id } = await context.params;
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Ожидается JSON-тело запроса" },
        { status: 400 },
      );
    }

    const parsed = updateProductSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Ошибка валидации",
          issues: parsed.error.flatten(),
        },
        { status: 400 },
      );
    }

    const product = await updateProduct(id, sellerProfileId, parsed.data);
    return NextResponse.json(product);
  } catch (err) {
    if (err instanceof ProductServiceError) {
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: err.status },
      );
    }
    console.error("[PATCH /api/products/:id]", err);
    return NextResponse.json(
      { error: "Не удалось обновить товар" },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/products/[id]
 * Hard-delete owned product. Requires seller session.
 */
export async function DELETE(_request: Request, context: RouteContext) {
  try {
    let sellerProfileId: string;
    try {
      const seller = await requireSellerSession();
      sellerProfileId = seller.sellerProfileId;
    } catch (err) {
      if (err instanceof AuthRequiredError) {
        return NextResponse.json({ error: "Требуется вход" }, { status: 401 });
      }
      if (err instanceof SellerRequiredError) {
        return NextResponse.json(
          { error: "Нужен профиль продавца" },
          { status: 403 },
        );
      }
      throw err;
    }

    const { id } = await context.params;
    await deleteProduct(id, sellerProfileId);
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    if (err instanceof ProductServiceError) {
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: err.status },
      );
    }
    console.error("[DELETE /api/products/:id]", err);
    return NextResponse.json(
      { error: "Не удалось удалить товар" },
      { status: 500 },
    );
  }
}
