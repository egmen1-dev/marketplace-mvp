import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AdminSellerGrowthPanel } from "@/features/admin/components/admin-seller-growth-panel";
import { AdminSellersTable, listAdminSellers } from "@/features/admin";
import { getAdminSellerGrowthOverview, isSellerGrowthEnabled } from "@/lib/seller-growth";

export const metadata = {
  title: "Продавцы",
};

export default async function AdminSellersPage() {
  const [sellers, growthOverview] = await Promise.all([
    listAdminSellers(),
    isSellerGrowthEnabled()
      ? getAdminSellerGrowthOverview()
      : Promise.resolve(null),
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

      {growthOverview ? (
        <AdminSellerGrowthPanel overview={growthOverview} />
      ) : null}

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
