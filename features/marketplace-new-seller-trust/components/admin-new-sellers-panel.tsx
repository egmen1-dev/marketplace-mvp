import type { AdminNewSellerStats } from "@/lib/marketplace-new-seller-trust/types";

type AdminNewSellersPanelProps = {
  stats: AdminNewSellerStats;
};

export function AdminNewSellersPanel({ stats }: AdminNewSellersPanelProps) {
  return (
    <section className="rounded-2xl border border-border bg-card p-5" data-testid="admin-new-sellers">
      <p className="font-medium">Новые продавцы</p>
      <p className="mt-3 text-sm text-muted-foreground">Сегодня: {stats.todayCount}</p>
      <p className="mt-4 text-sm font-medium">Из них:</p>
      <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
        <li>{stats.verifiedCount} подтвердили данные</li>
        <li>{stats.firstOrderCount} получили первый заказ</li>
        <li>{stats.firstReviewCount} получили первый отзыв</li>
      </ul>
    </section>
  );
}
