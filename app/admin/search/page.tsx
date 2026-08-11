import { expandSearch } from "@/features/search/engine";
import { getSearchAnalytics } from "@/features/search/analytics";
import { listProducts } from "@/features/products/queries";
import { ROUTES } from "@/lib/constants";

export const dynamic = "force-dynamic";

type PageProps = { searchParams: Promise<{ q?: string }> };

export default async function AdminSearchPage({ searchParams }: PageProps) {
  const { q } = await searchParams;

  let parsed: Awaited<ReturnType<typeof expandSearch>> | null = null;
  let resultCount = 0;
  if (q?.trim()) {
    try {
      parsed = await expandSearch(q);
      const res = await listProducts({ query: q, status: "ACTIVE", pageSize: 1 });
      resultCount = res.total;
    } catch (err) {
      console.error("[admin/search]", err);
    }
  }

  const analytics = await getSearchAnalytics().catch(() => null);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold">Поиск — отладка</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Search Intelligence: разбор запроса, объяснение и аналитика. Только для админа.
        </p>
      </div>

      <form method="get" action={ROUTES.ADMIN_SEARCH} className="flex gap-2">
        <input
          name="q"
          defaultValue={q ?? ""}
          placeholder="Введите поисковый запрос…"
          className="h-10 flex-1 rounded-xl border border-input bg-surface px-3.5 text-sm"
        />
        <button type="submit" className="h-10 rounded-xl bg-primary px-4 text-sm font-medium text-primary-foreground">
          Разобрать
        </button>
      </form>

      {parsed ? (
        <section
          className="flex flex-col gap-3 rounded-2xl border border-border bg-surface/40 p-4"
          data-testid="search-explain"
        >
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="rounded-full bg-primary/10 px-2 py-0.5 font-medium">
              intent: {parsed.parsed.intent}
            </span>
            <span className="rounded-full bg-muted px-2 py-0.5">
              найдено: {resultCount}
            </span>
          </div>
          <dl className="grid gap-2 text-sm sm:grid-cols-2">
            <Row label="Нормализация" value={parsed.parsed.normalized} />
            <Row label="Токены" value={parsed.parsed.tokens.join(", ")} />
            <Row
              label="Исправления"
              value={parsed.parsed.corrections.map((c) => `${c.from}→${c.to}`).join(", ")}
            />
            <Row label="Синонимы" value={parsed.parsed.synonyms.join(", ")} />
            <Row label="Бренды" value={parsed.parsed.brands.join(", ")} />
            <Row label="Модели" value={parsed.parsed.models.join(", ")} />
            <Row
              label="Характеристики"
              value={parsed.parsed.attributes.map((a) => `${a.value} ${a.unit}`).join(", ")}
            />
            <Row label="Негативы" value={parsed.parsed.negatives.join(", ")} />
            <Row label="Расширенные термины" value={parsed.terms.join(", ")} />
          </dl>
          <div>
            <p className="text-xs font-medium text-muted-foreground">Объяснение</p>
            <ul className="mt-1 flex flex-col gap-0.5 text-sm" data-testid="search-explain-list">
              {parsed.parsed.explain.map((e, i) => (
                <li key={i}>
                  <span className="text-muted-foreground">{e.label}:</span> {e.detail}
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}

      {analytics ? (
        <section className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-border bg-surface/40 p-4">
            <h2 className="font-heading text-sm font-semibold">Показатели (30 дней)</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Всего запросов: {analytics.total} · Пустых: {analytics.empty} · Успешность:{" "}
              {Math.round(analytics.successRate * 100)}%
            </p>
            <p className="mt-3 text-xs font-medium text-muted-foreground">Частые запросы</p>
            <ul className="mt-1 text-sm">
              {analytics.frequent.map((f) => (
                <li key={f.query}>
                  {f.query} — {f.count}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl border border-border bg-surface/40 p-4">
            <h2 className="font-heading text-sm font-semibold">Пустые запросы</h2>
            <ul className="mt-2 text-sm">
              {analytics.topEmpty.length === 0 ? (
                <li className="text-muted-foreground">Нет</li>
              ) : (
                analytics.topEmpty.map((f) => (
                  <li key={f.query}>
                    {f.query} — {f.count}
                  </li>
                ))
              )}
            </ul>
          </div>
        </section>
      ) : null}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="font-medium">{value || "—"}</dd>
    </div>
  );
}
