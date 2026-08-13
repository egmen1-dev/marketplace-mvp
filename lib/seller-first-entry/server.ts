import { redirect } from "next/navigation";

import { requireSellerCabinetAccess } from "@/features/auth";
import { SellerNextStepBanner } from "@/features/seller-first-entry";
import {
  checkSellerEntryRedirect,
  getSellerFirstEntryDashboard,
  isSellerFirstEntryEnabled,
} from "@/lib/seller-first-entry";

/** Redirect new sellers to /account/seller-start when eligible. */
export async function enforceSellerFirstEntry(pathname: string) {
  const seller = await requireSellerCabinetAccess(pathname);
  if (!isSellerFirstEntryEnabled()) return seller;

  const target = await checkSellerEntryRedirect({
    sellerProfileId: seller.sellerProfileId,
    pathname,
  });
  if (target) redirect(target);
  return seller;
}

export async function loadSellerNextStepBanner(sellerProfileId: string) {
  if (!isSellerFirstEntryEnabled()) return null;
  const data = await getSellerFirstEntryDashboard(sellerProfileId);
  return data.showNextStep ? data : null;
}
