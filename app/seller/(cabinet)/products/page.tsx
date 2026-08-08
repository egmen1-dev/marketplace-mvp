import { redirect } from "next/navigation";

import { ROUTES } from "@/lib/constants";

export default function SellerProductsRedirect() {
  redirect(ROUTES.ACCOUNT_PRODUCTS);
}
