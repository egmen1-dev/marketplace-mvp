import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AdminSellersTable, listAdminSellers } from "@/features/admin";

export const metadata = {
  title: "Продавцы",
};

export default async function AdminSellersPage() {
  const sellers = await listAdminSellers();

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
