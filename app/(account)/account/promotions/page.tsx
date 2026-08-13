import { redirect } from "next/navigation";

import { ROUTES } from "@/lib/constants";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Продвижение товаров",
};

/** Legacy route — redirects to intelligent promotion center. */
export default function AccountPromotionsRedirectPage() {
  redirect(ROUTES.ACCOUNT_PROMOTION_CENTER);
}
