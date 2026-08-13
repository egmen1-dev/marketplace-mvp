import type { SellerDiscoveryTips } from "@/lib/marketplace-discovery/types";

type SellerDiscoveryTipsPanelProps = {
  tips: SellerDiscoveryTips;
};

export function SellerDiscoveryTipsPanel({ tips }: SellerDiscoveryTipsPanelProps) {
  if (!tips.enabled) {
    return (
      <p className="text-sm text-muted-foreground">
        MARKETPLACE_DISCOVERY_ENABLED=false
      </p>
    );
  }

  return (
    <div
      className="rounded-2xl border border-border bg-card p-6"
      data-testid="seller-discovery-tips"
    >
      <h2 className="font-heading text-lg font-semibold">
        Как попасть в Находки ЛОТ
      </h2>
      <p className="mt-2 text-sm text-muted-foreground">
        {tips.canAppear
          ? "Ваши товары могут попасть в подборки — продолжайте улучшать карточки."
          : "Улучшите карточки, чтобы попасть в подборки Находок."}
      </p>

      {tips.strengths.length > 0 ? (
        <div className="mt-4">
          <p className="text-sm font-medium">Сильные стороны:</p>
          <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
            {tips.strengths.map((s) => (
              <li key={s}>✓ {s}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {tips.blockers.length > 0 ? (
        <div className="mt-4">
          <p className="text-sm font-medium">Не хватает:</p>
          <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
            {tips.blockers.map((b) => (
              <li key={b}>○ {b}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
