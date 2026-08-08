import { redirect } from "next/navigation";

import { ROUTES } from "@/lib/constants";

/** @deprecated Use `/account/favorites` */
export default function LegacyFavoritesRedirect() {
  redirect(ROUTES.FAVORITES);
}
