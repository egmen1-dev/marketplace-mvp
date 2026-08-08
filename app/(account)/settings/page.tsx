import { redirect } from "next/navigation";

import { ROUTES } from "@/lib/constants";

/** @deprecated Use `/account/settings` */
export default function LegacySettingsRedirect() {
  redirect(ROUTES.SETTINGS);
}
