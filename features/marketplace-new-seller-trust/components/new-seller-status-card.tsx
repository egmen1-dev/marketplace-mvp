import type { NewSellerTrustSnapshot } from "@/lib/marketplace-new-seller-trust/types";
import { NEW_SELLER_HISTORY_NOTE } from "@/lib/marketplace-new-seller-trust";

type NewSellerStatusCardProps = {
  snapshot: NewSellerTrustSnapshot;
};

export function NewSellerStatusCard({ snapshot }: NewSellerStatusCardProps) {
  if (!snapshot.isNewSeller) return null;

  return (
    <section
      className="rounded-2xl border border-dashed border-border bg-muted/20 p-4 text-sm"
      data-testid="new-seller-status"
    >
      <p className="font-medium">{snapshot.trustTier.label}</p>
      <p className="mt-1 text-muted-foreground">
        Аккаунт создан: {snapshot.joinedLabel}
      </p>
      <p className="mt-1 text-muted-foreground">{NEW_SELLER_HISTORY_NOTE}</p>
    </section>
  );
}
