import { AdminPayoutPanel } from "@/features/seller-payout";
import { requireAdminSession } from "@/features/auth";
import { getAdminPayoutDashboard } from "@/lib/seller-payout";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Admin — Выплаты",
};

export default async function AdminPayoutsPage() {
  await requireAdminSession();
  const data = await getAdminPayoutDashboard();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          Выплаты продавцам
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Очередь заявок и ручное подтверждение выплат без Stripe Connect.
        </p>
      </div>
      <AdminPayoutPanel data={data} />
    </div>
  );
}
