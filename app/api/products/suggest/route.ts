import { NextResponse } from "next/server";

import { suggestCatalog } from "@/features/products/queries";
import { suggestQuerySchema } from "@/features/products/schemas";

/**
 * GET /api/products/suggest?q=
 * Autocomplete: categories + ACTIVE product titles.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const parsed = suggestQuerySchema.safeParse({
      q: searchParams.get("q") ?? "",
      limit: searchParams.get("limit") ?? undefined,
    });

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Некорректный запрос",
          issues: parsed.error.flatten(),
        },
        { status: 400 },
      );
    }

    const items = await suggestCatalog(parsed.data.q, parsed.data.limit);
    return NextResponse.json({ items, q: parsed.data.q });
  } catch (err) {
    console.error("[GET /api/products/suggest]", err);
    return NextResponse.json(
      { error: "Не удалось получить подсказки" },
      { status: 500 },
    );
  }
}
