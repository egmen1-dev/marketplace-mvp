import { getRankingDebug } from "@/lib/ranking/aggregate";
import { RANKING_VERSION, LOT_RANKING_V1_WEIGHTS } from "@/lib/ranking";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<{ q?: string }>;
};

const SIGNALS: Array<{ key: keyof typeof LOT_RANKING_V1_WEIGHTS; label: string }> = [
  { key: "text", label: "Text" },
  { key: "commercial", label: "Commercial" },
  { key: "trust", label: "Trust" },
  { key: "conversion", label: "Conv." },
  { key: "price", label: "Price" },
  { key: "logistics", label: "Logist." },
  { key: "content", label: "Content" },
  { key: "stock", label: "Stock" },
  { key: "freshness", label: "Fresh" },
];

function pct(n: number) {
  return `${Math.round(n * 100)}`;
}

export default async function AdminRankingPage({ searchParams }: PageProps) {
  const { q } = await searchParams;
  let rows: Awaited<ReturnType<typeof getRankingDebug>> = [];
  let error: string | null = null;
  try {
    rows = await getRankingDebug(prisma, { query: q, limit: 25 });
  } catch (err) {
    console.error("[admin/ranking]", err);
    error = "Не удалось рассчитать ранжирование.";
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold">Ranking debug</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {RANKING_VERSION} · веса:{" "}
          {SIGNALS.map((s) => `${s.label} ${pct(LOT_RANKING_V1_WEIGHTS[s.key])}%`).join(
            " · ",
          )}
          . Promotion — отдельный boost поверх organic. Только для админа.
        </p>
      </div>

      <form className="flex gap-2" action="/admin/ranking" method="get">
        <input
          type="text"
          name="q"
          defaultValue={q ?? ""}
          placeholder="Поиск товара по названию…"
          className="h-10 flex-1 rounded-xl border border-input bg-surface px-3.5 text-sm"
        />
        <button
          type="submit"
          className="h-10 rounded-xl bg-primary px-4 text-sm font-medium text-primary-foreground"
        >
          Показать
        </button>
      </form>

      {error ? (
        <p className="rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border">
          <table className="w-full min-w-[860px] text-left text-xs" data-testid="ranking-debug-table">
            <thead className="bg-surface/60 text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">Товар</th>
                <th className="px-2 py-2 font-medium">Final</th>
                <th className="px-2 py-2 font-medium">Organic</th>
                <th className="px-2 py-2 font-medium">Promo</th>
                {SIGNALS.map((s) => (
                  <th key={s.key} className="px-2 py-2 font-medium">
                    {s.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.productId} className="border-t border-border">
                  <td className="max-w-[220px] truncate px-3 py-2">{r.name}</td>
                  <td className="px-2 py-2 font-semibold text-foreground">
                    {r.finalScore.toFixed(3)}
                  </td>
                  <td className="px-2 py-2">{r.organicScore.toFixed(3)}</td>
                  <td className="px-2 py-2">{r.promotionBoost.toFixed(2)}</td>
                  {SIGNALS.map((s) => (
                    <td key={s.key} className="px-2 py-2 text-muted-foreground">
                      {r.breakdown[s.key].toFixed(2)}
                    </td>
                  ))}
                </tr>
              ))}
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={4 + SIGNALS.length} className="px-3 py-6 text-center text-muted-foreground">
                    Нет товаров для отображения.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
