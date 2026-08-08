import { redirect } from "next/navigation";

import { ROUTES } from "@/lib/constants";

/** @deprecated Use `/account/orders` */
export default function LegacyOrdersRedirect() {
  redirect(ROUTES.ORDERS);
}
