import { notFound } from "next/navigation";

import { AccountShell } from "@/features/account";
import { requireSellerCabinetAccess } from "@/features/auth";
import { PickupPointForm } from "@/features/pickup";
import { getPickupPointForSeller } from "@/features/pickup/queries";
import { ROUTES } from "@/lib/constants";

export const dynamic = "force-dynamic";

export const metadata = { title: "Редактирование точки" };

type PageProps = { params: Promise<{ id: string }> };

export default async function EditPickupPointPage({ params }: PageProps) {
  const { id } = await params;
  const seller = await requireSellerCabinetAccess(
    `${ROUTES.ACCOUNT_PICKUP_POINTS}/${id}/edit`,
  );
  const point = await getPickupPointForSeller(id, seller.sellerProfileId);
  if (!point) notFound();

  return (
    <AccountShell
      title="Редактирование точки"
      description={point.name}
    >
      <PickupPointForm mode="edit" point={point} />
    </AccountShell>
  );
}
