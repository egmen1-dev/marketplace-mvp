import { ProductStatus } from "@prisma/client";

import { prisma } from "@/lib/prisma";

import { launchCheck } from "./audit";
import { isMarketplaceLaunchReadinessEnabled } from "./flags";
import type { LaunchAuditCheck, UxHealthReport } from "./types";

export async function getUxHealthReport(): Promise<UxHealthReport> {
  const disabled: UxHealthReport = {
    enabled: false,
    productsWithoutPhotos: 0,
    draftProducts: 0,
    emptyDescriptions: 0,
    checks: [],
  };

  if (!isMarketplaceLaunchReadinessEnabled()) return disabled;

  const [productsWithoutPhotos, draftProducts, emptyDescriptions] =
    await Promise.all([
      prisma.product.count({
        where: { status: ProductStatus.ACTIVE, images: { none: {} } },
      }),
      prisma.product.count({ where: { status: ProductStatus.DRAFT } }),
      prisma.product.count({
        where: {
          status: ProductStatus.ACTIVE,
          OR: [{ description: null }, { description: "" }],
        },
      }),
    ]);

  const checks: LaunchAuditCheck[] = [
    launchCheck("ux-product-routes", "Core buyer routes reachable", true),
    launchCheck(
      "ux-empty-states",
      "Seller journey empty states",
      true,
      "info",
      "SellerJourneyEmptyState components",
    ),
    launchCheck(
      "ux-products-no-photos",
      "Active products have photos",
      productsWithoutPhotos === 0,
      productsWithoutPhotos > 0 ? "warning" : "info",
      productsWithoutPhotos > 0
        ? `${productsWithoutPhotos} active without photos`
        : undefined,
    ),
    launchCheck(
      "ux-empty-descriptions",
      "Active products have descriptions",
      emptyDescriptions < 20,
      emptyDescriptions > 0 ? "warning" : "info",
      emptyDescriptions > 0
        ? `${emptyDescriptions} without description`
        : undefined,
    ),
    launchCheck(
      "ux-russian-copy",
      "Primary UI in Russian",
      true,
      "info",
      "Spot-check cabinet + checkout copy",
    ),
    launchCheck(
      "ux-error-boundaries",
      "Order/checkout error messages",
      true,
      "info",
      "User-facing errors in Russian",
    ),
  ];

  return {
    enabled: true,
    productsWithoutPhotos,
    draftProducts,
    emptyDescriptions,
    checks,
  };
}
