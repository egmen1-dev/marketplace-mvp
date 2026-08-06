import { NextResponse } from "next/server";

import { listCategoryTree } from "@/features/catalog/queries";

/**
 * GET /api/categories/tree
 * Nested active category tree (L1 → L2 → L3).
 */
export async function GET() {
  try {
    const tree = await listCategoryTree({ activeOnly: true });
    return NextResponse.json({ tree });
  } catch (err) {
    console.error("[GET /api/categories/tree]", err);
    return NextResponse.json(
      { error: "Не удалось получить дерево категорий" },
      { status: 500 },
    );
  }
}
