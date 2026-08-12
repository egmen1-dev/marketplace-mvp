import { NextResponse } from "next/server";
import { z } from "zod";

import {
  recordUnderstandingCorrection,
  understandProduct,
} from "@/lib/product-understanding";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/product-understanding
 * Body: { title, description?, categoryHint? }
 * Returns ProductUnderstandingResult (suggestions only).
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = z
      .object({
        title: z.string().trim().min(2).max(300),
        description: z.string().trim().max(10_000).optional().nullable(),
        categoryHint: z.string().trim().max(120).optional().nullable(),
      })
      .safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Некорректный запрос", issues: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const result = await understandProduct(prisma, parsed.data);
    return NextResponse.json(result);
  } catch (err) {
    console.error("[product-understanding]", err);
    return NextResponse.json(
      { error: "Не удалось проанализировать товар" },
      { status: 500 },
    );
  }
}

/**
 * PUT /api/product-understanding
 * Record seller correction (knowledge loop).
 */
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const parsed = z
      .object({
        field: z.string().min(1).max(120),
        suggested: z.string().optional().nullable(),
        corrected: z.string().optional().nullable(),
        title: z.string().optional().nullable(),
        productTypeId: z.string().optional().nullable(),
        sellerId: z.string().optional().nullable(),
        meta: z.record(z.string(), z.unknown()).optional().nullable(),
      })
      .safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Некорректный запрос" }, { status: 400 });
    }

    await recordUnderstandingCorrection(prisma, parsed.data);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[product-understanding/correction]", err);
    return NextResponse.json({ error: "Не удалось сохранить" }, { status: 500 });
  }
}
