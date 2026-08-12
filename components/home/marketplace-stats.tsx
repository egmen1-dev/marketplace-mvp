import {
  pluralizeCategoryWord,
  pluralizeProductWord,
  pluralizeSellerWord,
} from "@/lib/i18n";
import { formatCount } from "@/lib/format/number";

type MarketplaceStatsProps = {
  products: number;
  sellers: number;
  categories: number;
};

/**
 * Compact live marketplace counters. Render only when parent has real DB totals.
 */
export function MarketplaceStats({
  products,
  sellers,
  categories,
}: MarketplaceStatsProps) {
  const items = [
    { label: pluralizeProductWord(products), value: products },
    { label: pluralizeSellerWord(sellers), value: sellers },
    { label: pluralizeCategoryWord(categories), value: categories },
  ].filter((item) => item.value > 0);

  if (items.length === 0) return null;

  return (
    <section
      className="border-y border-border bg-surface/40"
      aria-label="Статистика площадки"
    >
      <div className="mx-auto grid max-w-7xl grid-cols-3 gap-2 px-4 py-6 sm:gap-6 sm:px-6 sm:py-8">
        {items.map((item) => (
          <div key={item.label} className="text-center">
            <p className="font-heading text-xl font-semibold tracking-tight tabular-nums text-foreground sm:text-2xl">
              {formatCount(item.value)}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground sm:text-sm">
              {item.label.charAt(0).toUpperCase() + item.label.slice(1)}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
