import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AdminSellersTable, listAdminSellers } from "@/features/admin";
import { AdminSellerFunnelPanel } from "@/features/seller-lifecycle";
import { getAdminSellerFunnel } from "@/lib/seller-lifecycle";

export const metadata = {
  title: "Продавцы",
};

export default async function AdminSellersPage() {
  const [sellers, funnel] = await Promise.all([
    listAdminSellers(),
    getAdminSellerFunnel(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="font-heading text-2xl font-semibold tracking-tight">
          Продавцы
        </h2>
        <p className="text-sm text-muted-foreground">
          Всего магазинов: {sellers.length}
        </p>
      </div>

      <AdminSellerFunnelPanel funnel={funnel} />

      <Card>
        <CardHeader>
          <CardTitle>Магазины</CardTitle>
          <CardDescription>Блокировка и верификация</CardDescription>
        </CardHeader>
        <CardContent>
          <AdminSellersTable sellers={sellers} />
        </CardContent>
      </Card>
    </div>
  );
}
