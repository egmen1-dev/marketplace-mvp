import { redirect } from "next/navigation";

import { ROUTES } from "@/lib/constants";

/** Legacy seller cabinet root → unified account. */
export default function SellerCabinetRootRedirect() {
  redirect(ROUTES.ACCOUNT);
}
