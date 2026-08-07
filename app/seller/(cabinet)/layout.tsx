import { requireSellerCabinetAccess } from "@/features/auth";
import { SellerNav } from "@/features/seller";
import { ROUTES } from "@/lib/constants";

export default async function SellerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireSellerCabinetAccess(ROUTES.SELLER_DASHBOARD);

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-6 sm:px-6 lg:flex-row lg:items-start lg:gap-8 lg:py-8">
      <aside className="w-full shrink-0 border-b border-border pb-3 lg:w-52 lg:border-b-0 lg:pb-0">
        <SellerNav />
      </aside>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
