import { CheckCircle2 } from "lucide-react";

import type { TrustSignalsSnapshot } from "@/lib/marketplace-trust-loop/reviews/types";
import { VERIFIED_SELLER_EXPLANATION } from "@/lib/marketplace-trust-score";

type PdpTrustSignalsBlockProps = {
  signals: TrustSignalsSnapshot;
};

export function PdpTrustSignalsBlock({ signals }: PdpTrustSignalsBlockProps) {
  const useTrustScoreModel = signals.trustScore != null;

  if (useTrustScoreModel) {
    return (
      <section
        className="rounded-2xl border border-border bg-card p-4"
        data-testid="pdp-trust-signals"
      >
        <p className="text-sm text-muted-foreground">Продавец</p>
        <p className="font-heading text-2xl font-semibold">{signals.trustScore}/100</p>
        <p className="mt-1 text-sm font-medium">{signals.trustLevel}</p>

        {(signals.buyerReasons?.length ?? 0) > 0 ? (
          <div className="mt-4">
            <p className="text-sm font-medium">Почему:</p>
            <ul className="mt-2 space-y-2 text-sm text-muted-foreground">
              {signals.buyerReasons!.map((line) => (
                <li key={line} className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
                  <span>{line.replace(/^✓\s*/, "")}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {signals.verifiedSeller && (signals.verificationDetails?.length ?? 0) > 0 ? (
          <div className="mt-4 rounded-xl bg-muted/30 px-3 py-2.5 text-sm">
            <p className="font-medium">{VERIFIED_SELLER_EXPLANATION}</p>
            <p className="mt-1 text-xs text-muted-foreground">Проверено:</p>
            <ul className="mt-1 space-y-0.5 text-muted-foreground">
              {signals.verificationDetails!.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </div>
        ) : null}
      </section>
    );
  }

  const lines = [
    signals.verifiedSeller ? VERIFIED_SELLER_EXPLANATION : null,
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
