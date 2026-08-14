import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AdminSellersTable, listAdminSellers } from "@/features/admin";
import { AdminSellerActivationPanel } from "@/features/seller-first-entry";
import { AdminSellerJourneyFunnelPanel } from "@/features/seller-journey";
import { AdminSellerFunnelPanel } from "@/features/seller-lifecycle";
import { AdminSellerActivationIntelligencePanel } from "@/features/seller-business-intelligence";
import { AdminSellerOperationsHealthPanel } from "@/features/seller-operations";
import { getAdminSellerActivation } from "@/lib/seller-first-entry";
import { getAdminSellerJourneyFunnel } from "@/lib/seller-journey";
import { getAdminSellerFunnel } from "@/lib/seller-lifecycle";
import { getAdminSellerActivationIntelligence } from "@/lib/seller-business-intelligence";
import { getAdminSellerOperationsHealth } from "@/lib/seller-operations";

export const metadata = {
  title: "Продавцы",
};

export default async function AdminSellersPage() {
  const [sellers, funnel, activation, journeyFunnel, operationsHealth, activationIntel] =
    await Promise.all([
      listAdminSellers(),
      getAdminSellerFunnel(),
      getAdminSellerActivation(),
      getAdminSellerJourneyFunnel(),
      getAdminSellerOperationsHealth(),
      getAdminSellerActivationIntelligence(),
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
          <CardTitle>Seller Journey Funnel</CardTitle>
          <CardDescription>
            Единая воронка пути продавца — от старта до первой выплаты
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AdminSellerJourneyFunnelPanel funnel={journeyFunnel} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Seller Activation Intelligence</CardTitle>
          <CardDescription>
            AI-слой: где продавцы застревают и готовы к росту
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AdminSellerActivationIntelligencePanel data={activationIntel} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Seller Operations Health</CardTitle>
          <CardDescription>
            Ежедневные задачи продавцов: заказы, товары и потенциал роста
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AdminSellerOperationsHealthPanel data={operationsHealth} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Seller Activation</CardTitle>
          <CardDescription>
            Первый вход продавца и прохождение «Старт продавца» за 30 дней
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AdminSellerActivationPanel data={activation} />
        </CardContent>
      </Card>

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
