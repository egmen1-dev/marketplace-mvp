import { redirect } from "next/navigation";

import { ROUTES } from "@/lib/constants";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<{ section?: string }>;
};

/** Backward compatibility — profile lives in settings. */
export default async function AccountProfileRedirectPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const section = params.section ?? "profile";
  redirect(`${ROUTES.SETTINGS}?section=${section}#${section}`);
}
