import { NextResponse } from "next/server";

import { getCartProductsByIds } from "@/features/cart/queries";

/**
 * GET /api/cart/products?ids=id1,id2
 * Hydrate product snapshots for guest cart display (public).
 */
export async function GET(request: Request) {
  try {
    const raw = new URL(request.url).searchParams.get("ids") ?? "";
    const ids = raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 100);

    if (ids.length === 0) {
      return NextResponse.json({ items: [] });
    }

    const items = await getCartProductsByIds(ids);
    return NextResponse.json({ items });
  } catch (err) {
    console.error("[GET /api/cart/products]", err);
    return NextResponse.json(
      { error: "Не удалось загрузить товары" },
      { status: 500 },
    );
  }
}
