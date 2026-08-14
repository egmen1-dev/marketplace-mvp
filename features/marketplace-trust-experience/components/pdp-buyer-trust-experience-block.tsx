import { CheckCircle2 } from "lucide-react";

import type { BuyerTrustExperienceSnapshot } from "@/lib/marketplace-trust-experience/types";

type PdpBuyerTrustExperienceBlockProps = {
  snapshot: BuyerTrustExperienceSnapshot;
};

export function PdpBuyerTrustExperienceBlock({ snapshot }: PdpBuyerTrustExperienceBlockProps) {
  return (
    <section
      className="rounded-2xl border border-border bg-card p-4"
      data-testid="pdp-buyer-trust-experience"
    >
      <p className="font-medium">{snapshot.headline}</p>
      <p className="mt-2 text-sm text-muted-foreground">
        Ваш уровень доверия: {snapshot.level.label}
      </p>

      <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
        {snapshot.reasons.map((line) => (
          <li key={line} className="flex items-start gap-2">
            <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
            <span>{line.replace(/^✓\s*/, "")}</span>
          </li>
        ))}
      </ul>

      {snapshot.verificationDetails.length > 0 ? (
        <div className="mt-4 rounded-xl bg-muted/30 px-3 py-2.5 text-sm">
          <p className="font-medium">Данные продавца подтверждены</p>
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
