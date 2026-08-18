import { ProductStatus } from "@prisma/client";

import { getSellerTrustProfile } from "@/features/seller/lib/reputation";
import { prisma } from "@/lib/prisma";

export type MobileSellerPublicProfile = {
  id: string;
  storeName: string;
  slug: string | null;
  description: string | null;
  isVerified: boolean;
  productCount: number;
  available: boolean;
};

export async function buildMobileSellerPublicProfile(
  sellerIdOrSlug: string,
): Promise<MobileSellerPublicProfile | null> {
  const profile = await getSellerTrustProfile(sellerIdOrSlug);
  if (!profile) return null;

  const productCount = await prisma.product.count({
    where: {
      sellerId: profile.id,
      status: ProductStatus.ACTIVE,
    },
  });

  return {
    id: profile.id,
    storeName: profile.storeName,
    slug: profile.slug,
    description: profile.description,
    isVerified: profile.isVerified,
    productCount,
    available: productCount > 0 || Boolean(profile.description),
  };
}
