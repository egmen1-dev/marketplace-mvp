import { NextResponse } from "next/server";

import {
  AuthRequiredError,
  requireSellerFromRequest,
  SellerRequiredError,
} from "@/features/auth/resolve-request-user";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const seller = await requireSellerFromRequest(request);
    const { id: productId } = await context.params;
    const product = await prisma.product.findFirst({
      where: { id: productId, sellerId: seller.sellerProfileId },
      include: { productModeration: true },
    });

    if (!product) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const issues = Array.isArray(product.productModeration?.issues)
      ? (product.productModeration?.issues as {
          userMessage?: string;
          message?: string;
          remediation?: string;
          code?: string;
        }[])
      : [];

    return NextResponse.json({
      productId,
      status: product.productModeration?.status ?? null,
      moderationState: product.productModeration?.status ?? null,
      riskScore: product.productModeration?.riskScore ?? null,
      systemRecommendation: product.productModeration?.systemRecommendation ?? null,
      submittedAt: product.productModeration?.submittedAt ?? null,
      reviewedAt: product.productModeration?.reviewedAt ?? null,
      notes: product.productModeration?.notes ?? null,
      reasonCodes: product.productModeration?.reasonCodes ?? [],
      issues: issues.map((issue) => ({
        code: issue.code ?? null,
        message: issue.userMessage ?? issue.message ?? null,
        remediation: issue.remediation ?? null,
      })),
      sellerLabel:
        product.productModeration?.status === "NEEDS_FIX"
          ? "Нужно исправить"
          : product.productModeration?.status === "REJECTED"
            ? "Отклонён"
            : product.productModeration?.status === "PENDING_REVIEW"
              ? "На проверке"
              : product.productModeration?.status === "APPROVED"
                ? "Опубликован"
                : null,
    });
  } catch (error) {
    if (error instanceof AuthRequiredError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (error instanceof SellerRequiredError) {
      return NextResponse.json({ error: "Seller required" }, { status: 403 });
    }
    throw error;
  }
}
