import { requireSellerCabinetAccess } from "@/features/auth";
import { FinanceEducationPanel } from "@/features/marketplace-education";
import { isMarketplaceEducationEnabled } from "@/lib/marketplace-education";
import { ROUTES } from "@/lib/constants";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Баланс и выплаты",
};

export default async function AccountBalancePage() {
  await requireSellerCabinetAccess(ROUTES.ACCOUNT_BALANCE);
  const educationEnabled = isMarketplaceEducationEnabled();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          Баланс и выплаты
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Объяснение движения средств — без изменения финансовой логики заказов
          и платежей.
        </p>
      </div>
      {educationEnabled ? (
        <FinanceEducationPanel route={ROUTES.ACCOUNT_BALANCE} />
      ) : (
        <p className="text-sm text-muted-foreground">
          MARKETPLACE_EDUCATION_ENABLED=false
        </p>
      )}
    </div>
  );
}
