import {
  getSellerJourneyEmptyState,
  isSellerJourneyEnabled,
} from "@/lib/seller-journey";
import { SellerJourneyEmptyState } from "./seller-journey-card";

type SellerJourneyEmptyStateSlotProps = {
  sellerProfileId: string;
  context: "products" | "orders" | "payouts";
};

export async function SellerJourneyEmptyStateSlot({
  context,
}: SellerJourneyEmptyStateSlotProps) {
  if (!isSellerJourneyEnabled()) return null;
  const copy = await getSellerJourneyEmptyState(context);
  if (!copy) return null;
  return <SellerJourneyEmptyState {...copy} />;
}
