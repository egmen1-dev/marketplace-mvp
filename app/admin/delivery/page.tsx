import { AdminDeliveryDashboard } from "@/features/marketplace-delivery";
import { assertAdminDeliveryAccess } from "@/lib/marketplace-delivery/delivery/permissions";
import { getSessionUser } from "@/features/auth";
import { redirect } from "next/navigation";
import {
  getAdminDeliveryHealth,
  isMarketplaceDeliveryEnabled,
  listAdminShipments,
} from "@/lib/marketplace-delivery";
import { ROUTES } from "@/lib/constants";

export const metadata = { title: "Delivery" };

export default async function AdminDeliveryPage() {
  const user = await getSessionUser();
  if (!user) redirect(ROUTES.AUTH_SIGN_IN);
  assertAdminDeliveryAccess(user.role);

  const enabled = isMarketplaceDeliveryEnabled();
  const [health, shipments] = enabled
    ? await Promise.all([getAdminDeliveryHealth(), listAdminShipments()])
    : [
        { enabled: false, inTransit: 0, overdue: 0, problems: 0 },
        [],
      ];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          Delivery health
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Контроль отправлений и статусов доставки
        </p>
      </div>
      <AdminDeliveryDashboard health={health} shipments={shipments} />
    </div>
  );
}
