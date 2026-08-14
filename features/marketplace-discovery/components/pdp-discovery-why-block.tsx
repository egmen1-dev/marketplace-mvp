import type { DiscoveryWhyReason } from "@/lib/marketplace-discovery/types";

type PdpDiscoveryWhyBlockProps = {
  reasons: DiscoveryWhyReason[];
};

export function PdpDiscoveryWhyBlock({ reasons }: PdpDiscoveryWhyBlockProps) {
  if (reasons.length === 0) return null;

  return (
    <section
      className="rounded-2xl border border-border bg-card/50 p-4 sm:p-5"
      data-testid="pdp-discovery-why"
    >
      <h2 className="font-heading text-base font-semibold">
        Почему стоит посмотреть?
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Почему покупатели выбирают:
      </p>
      <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
        {reasons.map((reason) => (
          <li key={reason.id}>✓ {reason.label}</li>
        ))}
      </ul>
    </section>
  );
}
