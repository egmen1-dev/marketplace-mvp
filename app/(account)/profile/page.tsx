import { redirect } from "next/navigation";

import { ROUTES } from "@/lib/constants";

type ProfileRedirectProps = {
  searchParams: Promise<{ edit?: string }>;
};

/** Backward compatibility — profile fields live in settings. */
export default async function ProfileRedirectPage({ searchParams }: ProfileRedirectProps) {
  const { edit } = await searchParams;
  const hash = edit === "1" ? "#profile" : "";
  redirect(`${ROUTES.SETTINGS}${hash}`);
}
