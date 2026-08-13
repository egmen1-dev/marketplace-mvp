import { SellerNextStepBanner } from "./seller-start-panel";
import { loadSellerNextStepBanner } from "@/lib/seller-first-entry/server";

type SellerFirstEntryBannerSlotProps = {
  sellerProfileId: string;
};

export async function SellerFirstEntryBannerSlot({
  sellerProfileId,
}: SellerFirstEntryBannerSlotProps) {
  const data = await loadSellerNextStepBanner(sellerProfileId);
  if (!data) return null;
  return <SellerNextStepBanner data={data} />;
}
