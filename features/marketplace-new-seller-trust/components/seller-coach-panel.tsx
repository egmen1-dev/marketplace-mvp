import type { SellerCoachSnapshot } from "@/lib/marketplace-new-seller-trust/types";

type SellerCoachPanelProps = {
  coach: SellerCoachSnapshot;
};

export function SellerCoachPanel({ coach }: SellerCoachPanelProps) {
  return (
    <section
      className="rounded-2xl border border-border bg-card p-5"
      data-testid="seller-trust-coach"
    >
      <p className="font-medium">До следующего уровня: {coach.nextLevelLabel}</p>
      <p className="mt-2 text-sm text-muted-foreground">Осталось:</p>
      <ul className="mt-2 space-y-1 text-sm">
        {coach.items.map((item) => (
          <li key={item.label}>
            {item.remaining} {item.label}
          </li>
        ))}
      </ul>
    </section>
  );
}
