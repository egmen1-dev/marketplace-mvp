import { redirect } from "next/navigation";

import { ROUTES } from "@/lib/constants";

export default function SellerDashboardRedirect() {
  redirect(ROUTES.ACCOUNT);
}
