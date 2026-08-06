import { NextResponse } from "next/server";

import { listCategories } from "@/features/catalog/queries";

/**
 * GET /api/categories
 * Lists active categories with ACTIVE product counts.
 */
export async function GET() {
  try {
    const categories = await listCategories({ activeOnly: true });
    return NextResponse.json({ items: categories });
  } catch (err) {
    console.error("[GET /api/categories]", err);
    return NextResponse.json(
      { error: "Не удалось получить категории" },
      { status: 500 },
    );
  }
}
