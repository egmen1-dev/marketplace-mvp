import { redirect } from "next/navigation";

import { ROUTES } from "@/lib/constants";

export default function SellerOrdersRedirect() {
  redirect(ROUTES.ACCOUNT_SALES);
}
