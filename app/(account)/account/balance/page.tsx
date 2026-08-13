import { requireSellerSession } from "@/features/auth";
import { SellerBalancePanel } from "@/features/finance/components/seller-balance-panel";
import { getSellerBalanceForSession } from "@/lib/finance";
import { isSellerPayoutEnabled } from "@/lib/seller-payout/flags";

export const metadata = {
  title: "Баланс",
};

export default async function AccountBalancePage() {
  const seller = await requireSellerSession();
  const balance = await getSellerBalanceForSession(seller.sellerProfileId);
  const payoutEnabled = isSellerPayoutEnabled();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">
          Баланс продавца
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {payoutEnabled
            ? "Виртуальный баланс маркетплейса — ожидание, доступные средства и вывод."
            : "Виртуальный баланс маркетплейса. Вывод средств пока недоступен."}
        </p>
      </div>
      <SellerBalancePanel balance={balance} payoutEnabled={payoutEnabled} />
    </div>
  );
}
