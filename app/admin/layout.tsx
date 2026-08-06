import { redirect } from "next/navigation";

import {
  AdminRequiredError,
  AuthRequiredError,
  requireAdminSession,
} from "@/features/auth";
import { AdminHeader, AdminNav } from "@/features/admin";
import { ROUTES } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let admin;
  try {
    admin = await requireAdminSession();
  } catch (err) {
    if (err instanceof AuthRequiredError) {
      redirect(
        `${ROUTES.AUTH_SIGN_IN}?callbackUrl=${encodeURIComponent(ROUTES.ADMIN)}`,
      );
    }
    if (err instanceof AdminRequiredError) {
      redirect(`${ROUTES.HOME}?error=admin_forbidden`);
    }
    throw err;
  }

  return (
    <div className="mx-auto flex max-w-6xl flex-col px-4 py-8 sm:px-6">
      <AdminHeader user={admin} />
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-10">
        <aside className="w-full shrink-0 border-b border-border pb-4 lg:w-52 lg:border-b-0 lg:pb-0">
          <AdminNav />
        </aside>
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}
