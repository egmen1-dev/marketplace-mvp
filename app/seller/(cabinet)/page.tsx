import { redirect } from "next/navigation";

import { ROUTES } from "@/lib/constants";

export default function SellerIndexPage() {
  redirect(ROUTES.SELLER_DASHBOARD);
}
