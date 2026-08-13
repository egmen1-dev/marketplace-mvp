import type { AdminTrustHealth } from "@/lib/marketplace-trust-loop/reviews/types";

type AdminTrustDashboardProps = {
  health: AdminTrustHealth;
};

export function AdminTrustDashboard({ health }: AdminTrustDashboardProps) {
  if (!health.enabled) {
    return (
      <p className="text-sm text-muted-foreground">MARKETPLACE_TRUST_LOOP_ENABLED=false</p>
    );
  }

  return (
    <div className="flex flex-col gap-6" data-testid="admin-trust-dashboard">
      <section className="rounded-2xl border border-border p-4">
        <h3 className="font-heading text-lg font-semibold">Marketplace Trust Health</h3>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <article>
            <p className="text-xs text-muted-foreground">Средний рейтинг</p>
            <p className="font-heading text-2xl font-semibold">
              {health.averageRating.toFixed(1)}
            </p>
          </article>
          <article>
            <p className="text-xs text-muted-foreground">Отзывов</p>
            <p className="font-heading text-2xl font-semibold">{health.reviewsCount}</p>
          </article>
          <article>
            <p className="text-xs text-muted-foreground">Высокое доверие</p>
            <p className="font-heading text-2xl font-semibold">
              {health.highTrustSellersPercent}%
            </p>
          </article>
        </div>
      </section>

      <section className="rounded-2xl border border-border p-4">
        <h3 className="font-medium">Moderation Health</h3>
        <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
          <li>Ожидают проверки: {health.pendingModeration}</li>
          <li>Проблемные карточки: {health.problematicCards}</li>
          <li>Запрещённые попытки: {health.prohibitedAttempts}</li>
        </ul>
      </section>

      <section className="rounded-2xl border border-border p-4">
        <h3 className="font-medium">Content Quality</h3>
        <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
          <li>Карточки без фото: {health.cardsWithoutPhotos}</li>
          <li>Низкий Quality Score: {health.lowQualityCards}</li>
        </ul>
      </section>
    </div>
  );
}
