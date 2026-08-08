import { redirect } from "next/navigation";

import { ROUTES } from "@/lib/constants";

export default function SellerNewProductRedirect() {
  redirect(ROUTES.ACCOUNT_PRODUCTS_NEW);
}
