import Link from "next/link";

import type { BuyerReactivationSignal } from "@/lib/marketplace-communication/types";

type BuyerReactivationSignalsStripProps = {
  signals: BuyerReactivationSignal[];
};

/** Foundation for buyer reactivation — preview only, no auto-send. */
export function BuyerReactivationSignalsStrip({
  signals,
}: BuyerReactivationSignalsStripProps) {
  if (signals.length === 0) return null;

  return (
    <div
      className="rounded-xl border border-violet-500/30 bg-violet-500/5 px-4 py-3 text-sm"
      data-testid="buyer-reactivation-signals"
    >
      <p className="mb-2 font-medium">Reactivation signals (preview)</p>
      <ul className="space-y-2">
        {signals.map((signal) => (
          <li key={signal.id}>
            <span className="text-muted-foreground">
              {signal.daysSinceInterest} дн. назад: «{signal.query}»
            </span>
            <span className="block text-foreground">{signal.messagePreview}</span>
            <Link
              href={signal.href}
              className="text-xs font-medium text-primary underline-offset-4 hover:underline"
            >
              Смотреть каталог →
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
