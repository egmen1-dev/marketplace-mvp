import { prisma } from "@/lib/prisma";

export async function getAdminModerationProductDetail(productId: string) {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: {
      productModeration: {
        include: {
          auditEvents: { orderBy: { createdAt: "desc" }, take: 20 },
        },
      },
      images: { orderBy: { sortOrder: "asc" } },
      seller: {
        select: {
          id: true,
          storeName: true,
          createdAt: true,
          _count: { select: { products: { where: { status: "ACTIVE" } } } },
        },
      },
      category: { select: { name: true } },
      productType: { select: { name: true } },
      characteristicValues: { include: { definition: true } },
    },
  });

  if (!product) return null;

  const moderationHistory = await prisma.productModeration.findMany({
    where: { product: { sellerId: product.sellerId } },
    select: {
      status: true,
      reviewedAt: true,
      product: { select: { name: true } },
    },
    orderBy: { updatedAt: "desc" },
    take: 10,
  });

  const previousRejects = moderationHistory.filter((row) => row.status === "REJECTED").length;
  const previousApprovals = moderationHistory.filter((row) => row.status === "APPROVED").length;

  return {
    product,
    sellerStats: {
      activeLots: product.seller._count.products,
      previousRejects,
      previousApprovals,
    },
  };
}
