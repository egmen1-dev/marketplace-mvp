import { getSellerTrustProfile } from "@/features/seller/lib/reputation";
import {
  formatSellerJoinedDate,
  formatSellerKindLabel,
  resolveSellerBadges,
  sellerBadgeLabel,
} from "@/features/seller/lib/reputation";

export type MobileSellerStorefrontPayload = {
  id: string;
  storeName: string;
  kindLabel: string;
  badges: string[];
  activeProducts: number;
  joinedLabel: string | null;
  respondsInChat: boolean;
};

export async function buildMobileSellerStorefront(
  idOrSlug: string,
): Promise<MobileSellerStorefrontPayload | null> {
  const profile = await getSellerTrustProfile(idOrSlug);
  if (!profile) return null;

  const badges = resolveSellerBadges({
    isVerified: profile.isVerified,
    kind: profile.kind,
    joinedAt: profile.joinedAt,
    completedOrdersCount: profile.metrics.completedOrdersCount,
  }).map(sellerBadgeLabel);

  return {
    id: profile.id,
    storeName: profile.storeName,
    kindLabel: formatSellerKindLabel(profile.kind),
    badges,
    activeProducts: profile.metrics.activeProducts,
    joinedLabel: profile.joinedAt
      ? `На LOT с ${formatSellerJoinedDate(profile.joinedAt)}`
      : null,
    respondsInChat: false,
  };
}
