import { CheckCircle2 } from "lucide-react";

import type { TrustSignalsSnapshot } from "@/lib/marketplace-trust-loop/reviews/types";

type PdpTrustSignalsBlockProps = {
  signals: TrustSignalsSnapshot;
};

export function PdpTrustSignalsBlock({ signals }: PdpTrustSignalsBlockProps) {
  const lines = [
    signals.verifiedSeller ? "✓ Проверенный продавец" : null,
    signals.completedOrders > 0
      ? `✓ ${signals.completedOrders} успешных заказов`
      : null,
    signals.satisfactionPercent > 0
      ? `✓ ${signals.satisfactionPercent}% покупателей довольны`
      : null,
    signals.hasBuyerPhotos ? "✓ Есть реальные фото покупателей" : null,
    signals.reviewsCount > 0 && signals.productRating
      ? `✓ Рейтинг товара ${signals.productRating.toFixed(1)}`
      : null,
  ].filter(Boolean) as string[];

  if (lines.length === 0) return null;

  return (
    <section
      className="rounded-2xl border border-border bg-card p-4"
      data-testid="pdp-trust-signals"
    >
      <p className="font-medium">Почему можно доверять покупке</p>
      <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
        {lines.map((line) => (
          <li key={line} className="flex items-start gap-2">
            <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
            <span>{line.replace(/^✓\s*/, "")}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
