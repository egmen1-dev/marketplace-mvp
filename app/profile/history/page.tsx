import { redirect } from "next/navigation";

import { ROUTES } from "@/lib/constants";

export default function ProfileHistoryRedirectPage() {
  redirect(ROUTES.HISTORY);
}
