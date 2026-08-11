import { ReviewStatus } from "@prisma/client";

import { adminModerateReview } from "@/features/reviews/actions";
import {
  adminListReviews,
  adminReviewCounters,
} from "@/features/reviews/queries";
import { ReviewStars } from "@/features/reviews/components";
import { ROUTES } from "@/lib/constants";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<{
    q?: string;
    rating?: string;
    status?: string;
    page?: string;
  }>;
};

const STATUS_LABEL: Record<ReviewStatus, string> = {
  PUBLISHED: "Опубликован",
  HIDDEN: "Скрыт",
  REMOVED: "Удалён",
  PENDING_REVIEW: "На модерации",
};

export default async function AdminReviewsPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const rating = sp.rating ? Number(sp.rating) : undefined;
  const status =
    sp.status && sp.status in STATUS_LABEL
      ? (sp.status as ReviewStatus)
      : undefined;
  const page = Math.max(1, Number(sp.page) || 1);

  let data: Awaited<ReturnType<typeof adminListReviews>> = {
    items: [],
    total: 0,
    page: 1,
    pageSize: 20,
  };
  let counters: Awaited<ReturnType<typeof adminReviewCounters>> = {
    total: 0,
    hidden: 0,
    avgMarketplaceRating: 0,
  };
  let error: string | null = null;
  try {
    [data, counters] = await Promise.all([
      adminListReviews({ q: sp.q, rating, status, page }),
      adminReviewCounters(),
    ]);
  } catch (err) {
    console.error("[admin/reviews]", err);
    error = "Не удалось загрузить отзывы.";
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold">Отзывы — модерация</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Всего: {counters.total} · Скрытых: {counters.hidden} · Средняя оценка
          маркетплейса:{" "}
          {counters.avgMarketplaceRating > 0
            ? counters.avgMarketplaceRating.toFixed(2)
            : "—"}
        </p>
      </div>

      <form method="get" action={ROUTES.ADMIN_REVIEWS} className="flex flex-wrap gap-2">
        <input
          name="q"
          defaultValue={sp.q ?? ""}
          placeholder="Поиск по тексту / товару…"
          className="h-10 min-w-[200px] flex-1 rounded-xl border border-input bg-surface px-3.5 text-sm"
        />
        <select
          name="rating"
          defaultValue={sp.rating ?? ""}
          className="h-10 rounded-xl border border-input bg-surface px-2.5 text-sm"
        >
          <option value="">Любая оценка</option>
          {[5, 4, 3, 2, 1].map((r) => (
            <option key={r} value={r}>
              {r} ★
            </option>
          ))}
        </select>
        <select
          name="status"
          defaultValue={sp.status ?? ""}
          className="h-10 rounded-xl border border-input bg-surface px-2.5 text-sm"
        >
          <option value="">Любой статус</option>
          {Object.entries(STATUS_LABEL).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="h-10 rounded-xl bg-primary px-4 text-sm font-medium text-primary-foreground"
        >
          Фильтр
        </button>
      </form>

      {error ? (
        <p className="rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : (
        <div className="flex flex-col gap-3" data-testid="admin-reviews-list">
          {data.items.length === 0 ? (
            <p className="text-sm text-muted-foreground">Отзывы не найдены.</p>
          ) : (
            data.items.map((r) => (
              <div
                key={r.id}
                className="flex flex-col gap-2 rounded-2xl border border-border bg-surface/40 p-4"
              >
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <ReviewStars value={r.rating} size={14} />
                  <span className="font-medium">{r.product.name}</span>
                  <span className="text-muted-foreground">· {r.sellerName}</span>
                  <span className="text-muted-foreground">· {r.authorName}</span>
                  <span className="ml-auto rounded-full bg-muted px-2 py-0.5 text-xs">
                    {STATUS_LABEL[r.status]}
                  </span>
                </div>
                {r.title ? <p className="text-sm font-medium">{r.title}</p> : null}
                {r.text ? (
                  <p className="text-sm whitespace-pre-line text-foreground/90">{r.text}</p>
                ) : null}
                <div className="flex flex-wrap gap-2">
                  <span className="text-xs text-muted-foreground">
                    Заказ: {r.orderId}
                  </span>
                  {(["hide", "restore", "remove"] as const).map((action) => (
                    <form key={action} action={adminModerateReview}>
                      <input type="hidden" name="reviewId" value={r.id} />
                      <input type="hidden" name="action" value={action} />
                      <button
                        type="submit"
                        data-testid={`moderate-${action}`}
                        className="rounded-lg border border-border px-2.5 py-1 text-xs hover:border-primary/40"
                      >
                        {action === "hide"
                          ? "Скрыть"
                          : action === "restore"
                            ? "Восстановить"
                            : "Удалить"}
                      </button>
                    </form>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
