import Link from "next/link";

import { Button } from "@/components/ui/button";
import { AccountShell } from "@/features/account";
import { requireSellerCabinetAccess } from "@/features/auth";
import { PickupPointsList } from "@/features/pickup";
import { listSellerPickupPoints } from "@/features/pickup/queries";
import { ROUTES } from "@/lib/constants";

export const dynamic = "force-dynamic";

export const metadata = { title: "Точки самовывоза" };

export default async function PickupPointsPage() {
  const seller = await requireSellerCabinetAccess(ROUTES.ACCOUNT_PICKUP_POINTS);
  const points = await listSellerPickupPoints(seller.sellerProfileId);

  return (
    <AccountShell
      title="Точки самовывоза"
      description="Адреса, где покупатели могут забрать товар."
      actions={
        <Button
          size="sm"
          nativeButton={false}
          render={<Link href={ROUTES.ACCOUNT_PICKUP_POINTS_NEW} />}
        >
          Добавить точку
        </Button>
      }
    >
      <PickupPointsList points={points} />
    </AccountShell>
  );
}
