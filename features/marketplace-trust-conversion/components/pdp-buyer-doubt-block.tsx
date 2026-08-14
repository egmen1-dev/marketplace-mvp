import type { BuyerDoubtSnapshot } from "@/lib/marketplace-trust-conversion/types";

type PdpBuyerDoubtBlockProps = {
  snapshot: BuyerDoubtSnapshot;
};

export function PdpBuyerDoubtBlock({ snapshot }: PdpBuyerDoubtBlockProps) {
  if (!snapshot.show) return null;

  const activeReasons = snapshot.reasons.filter((r) => r.active);

  return (
    <section
      className="rounded-2xl border border-dashed border-amber-500/40 bg-amber-500/5 p-4"
      data-testid="pdp-buyer-doubt"
    >
      <p className="font-medium">Покупатели смотрят товар, но сомневаются.</p>
      <p className="mt-2 text-sm text-muted-foreground">Возможные причины:</p>
      <ul className="mt-3 space-y-1.5 text-sm text-muted-foreground">
        {activeReasons.map((reason) => (
          <li key={reason.id} className="flex items-center gap-2">
            <span className="text-amber-600" aria-hidden>
              ○
            </span>
            {reason.label}
          </li>
        ))}
      </ul>
    </section>
  );
}
