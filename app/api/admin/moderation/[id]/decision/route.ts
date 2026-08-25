import { NextResponse } from "next/server";
import { z } from "zod";

import {
  AdminRequiredError,
  AuthRequiredError,
  requireAdminFromRequest,
} from "@/features/auth/resolve-request-user";
import { applyAdminModerationDecision } from "@/lib/moderation";
import { log } from "@/lib/logger";
import { prisma } from "@/lib/prisma";

const decisionSchema = z.object({
  action: z.enum(["APPROVE", "NEEDS_CHANGES", "REJECT", "ESCALATE"]),
  reasonCodes: z.array(z.string()).optional(),
  comment: z.string().optional(),
});

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdminFromRequest(request);
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
  } catch (err) {
    if (err instanceof AuthRequiredError) {
      return NextResponse.json({ error: "Требуется вход администратора" }, { status: 401 });
    }
    if (err instanceof AdminRequiredError) {
      return NextResponse.json({ error: "Требуются права администратора" }, { status: 403 });
    }
    log.error("admin_moderation_detail_unexpected", {
      errorName: err instanceof Error ? err.name : "unknown",
      errorMessage: err instanceof Error ? err.message.slice(0, 240) : "unknown",
    });
    console.error("[GET /api/admin/moderation/[id]/decision]", err);
    return NextResponse.json({ error: "Не удалось загрузить карточку модерации" }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const requestId = request.headers.get("x-request-id") ?? request.headers.get("x-acceptance-run-id");
  let productId: string | undefined;

  try {
    const admin = await requireAdminFromRequest(request);
    const params = await context.params;
    productId = params.id;

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Ожидается JSON-тело запроса" }, { status: 400 });
    }

    const parsed = decisionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Ошибка валидации", issues: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const result = await applyAdminModerationDecision({
      productId,
      adminUserId: admin.id,
      decision: parsed.data.action,
      reasonCodes: parsed.data.reasonCodes,
      comment: parsed.data.comment,
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
  } catch (err) {
    if (err instanceof AuthRequiredError) {
      return NextResponse.json({ error: "Требуется вход администратора" }, { status: 401 });
    }
    if (err instanceof AdminRequiredError) {
      return NextResponse.json({ error: "Требуются права администратора" }, { status: 403 });
    }
    log.error("admin_moderation_decision_unexpected", {
      requestId: requestId ?? undefined,
      productId,
      errorName: err instanceof Error ? err.name : "unknown",
      errorMessage: err instanceof Error ? err.message.slice(0, 240) : "unknown",
    });
    console.error("[POST /api/admin/moderation/[id]/decision]", err);
    return NextResponse.json({ error: "Не удалось применить решение модерации" }, { status: 500 });
  }
}
