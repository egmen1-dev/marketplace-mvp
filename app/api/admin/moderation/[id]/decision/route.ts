import { NextResponse } from "next/server";
import { z } from "zod";

import { requireAdminSession } from "@/features/auth";
import { applyAdminModerationDecision } from "@/lib/moderation";
import { prisma } from "@/lib/prisma";

const decisionSchema = z.object({
  action: z.enum(["APPROVE", "NEEDS_CHANGES", "REJECT", "ESCALATE"]),
  reasonCodes: z.array(z.string()).optional(),
  comment: z.string().optional(),
});

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  await requireAdminSession();
  const { id: productId } = await context.params;
  const detail = await prisma.product.findUnique({
    where: { id: productId },
    include: {
      productModeration: true,
      images: { orderBy: { sortOrder: "asc" } },
      seller: { select: { storeName: true, id: true, createdAt: true } },
      category: { select: { name: true } },
      productType: { select: { name: true } },
      characteristicValues: { include: { definition: true } },
    },
  });
  if (!detail) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ product: detail });
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const admin = await requireAdminSession();
  const { id: productId } = await context.params;
  const body = decisionSchema.parse(await request.json());

  const result = await applyAdminModerationDecision({
    productId,
    adminUserId: admin.id,
    decision: body.action,
    reasonCodes: body.reasonCodes,
    comment: body.comment,
  });

  if (!result.ok) {
    return NextResponse.json(
      {
        error:
          result.code === "ALREADY_REVIEWED"
            ? "ЛОТ уже проверен другим модератором"
            : "ЛОТ не найден",
        code: result.code,
      },
      { status: result.code === "ALREADY_REVIEWED" ? 409 : 404 },
    );
  }

  const detail = await prisma.product.findUnique({
    where: { id: productId },
    include: {
      productModeration: true,
      images: { orderBy: { sortOrder: "asc" } },
      seller: { select: { storeName: true, id: true } },
    },
  });

  return NextResponse.json({ ok: true, product: detail });
}
