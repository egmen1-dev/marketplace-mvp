import { redirect } from "next/navigation";

import { ROUTES } from "@/lib/constants";

export default function AccountPromotionsRedirect() {
  redirect(ROUTES.ACCOUNT_PROMOTION_CENTER);
}
