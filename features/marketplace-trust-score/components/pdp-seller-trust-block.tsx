import { CheckCircle2 } from "lucide-react";

import type { BuyerSellerTrustSnapshot } from "@/lib/marketplace-trust-score/types";

type PdpSellerTrustBlockProps = {
  snapshot: BuyerSellerTrustSnapshot;
  sellerName?: string;
};

export function PdpSellerTrustBlock({ snapshot, sellerName }: PdpSellerTrustBlockProps) {
  return (
    <section
      className="rounded-2xl border border-border bg-card p-4"
      data-testid="pdp-seller-trust-score"
    >
      <p className="text-sm text-muted-foreground">Продавец{ sellerName ? `: ${sellerName}` : ""}</p>
      <p className="font-heading text-2xl font-semibold">{snapshot.trustScore}/100</p>
      <p className="mt-1 text-sm font-medium">{snapshot.trustLevel}</p>

      {snapshot.reasons.length > 0 ? (
        <div className="mt-4">
          <p className="text-sm font-medium">Почему:</p>
          <ul className="mt-2 space-y-2 text-sm text-muted-foreground">
            {snapshot.reasons.map((line) => (
              <li key={line} className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
                <span>{line.replace(/^✓\s*/, "")}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {snapshot.verificationDetails.length > 0 ? (
        <div className="mt-4 rounded-xl bg-muted/30 px-3 py-2.5 text-sm">
          <p className="font-medium">Данные продавца подтверждены</p>
          <p className="mt-1 text-xs text-muted-foreground">Проверено:</p>
          <ul className="mt-1 space-y-0.5 text-muted-foreground">
            {snapshot.verificationDetails.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
