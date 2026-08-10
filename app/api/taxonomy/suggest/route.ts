import { NextResponse } from "next/server";

import { searchProductTypes, suggestProductTypes } from "@/features/taxonomy/queries";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") ?? "";
  const mode = searchParams.get("mode") ?? "suggest";
  const limit = Math.min(Number(searchParams.get("limit") ?? 5) || 5, 30);

  if (q.trim().length < 2) {
    return NextResponse.json({ results: [] });
  }

  const results =
    mode === "search"
      ? await searchProductTypes(q, limit)
      : await suggestProductTypes(q, limit);

  return NextResponse.json({ results });
}
