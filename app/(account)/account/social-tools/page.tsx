import { enforceSellerFirstEntry } from "@/lib/seller-first-entry/server";
import { SellerSocialToolsPanel } from "@/features/marketplace-social-growth";
import {
  getSellerSocialTools,
  isMarketplaceSocialGrowthEnabled,
} from "@/lib/marketplace-social-growth";
import { ROUTES } from "@/lib/constants";
import { prisma } from "@/lib/prisma";

export const metadata = { title: "Социальное продвижение" };

type PageProps = {
  searchParams: Promise<{ productId?: string }>;
};

export default async function AccountSocialToolsPage({ searchParams }: PageProps) {
  const seller = await enforceSellerFirstEntry(ROUTES.ACCOUNT_SOCIAL_TOOLS);
  const { productId } = await searchParams;

  const enabled = isMarketplaceSocialGrowthEnabled();
  let resolvedProductId = productId;

  if (!resolvedProductId) {
    const first = await prisma.product.findFirst({
      where: { sellerId: seller.sellerProfileId, status: "ACTIVE" },
      select: { id: true },
    });
    resolvedProductId = first?.id;
  }

  const tools =
    enabled && resolvedProductId
      ? await getSellerSocialTools({
          sellerProfileId: seller.sellerProfileId,
          productId: resolvedProductId,
        })
      : {
          enabled: false,
          productId: resolvedProductId ?? "",
          productTitle: "",
          canGenerate: false,
          blockers: [],
          options: [],
        };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">
          Социальное продвижение
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Создавайте контент для соцсетей без рекламного бюджета
        </p>
      </div>
      <SellerSocialToolsPanel tools={tools} />
    </div>
  );
}
