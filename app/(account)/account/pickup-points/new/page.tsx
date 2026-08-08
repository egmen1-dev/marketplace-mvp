import { AccountShell } from "@/features/account";
import { requireSellerCabinetAccess } from "@/features/auth";
import { PickupPointForm } from "@/features/pickup";
import { ROUTES } from "@/lib/constants";

export const dynamic = "force-dynamic";

export const metadata = { title: "Новая точка самовывоза" };

export default async function NewPickupPointPage() {
  await requireSellerCabinetAccess(ROUTES.ACCOUNT_PICKUP_POINTS_NEW);

  return (
    <AccountShell
      title="Новая точка самовывоза"
      description="Адрес склада или места выдачи."
    >
      <PickupPointForm mode="create" />
    </AccountShell>
  );
}
