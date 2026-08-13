import { SellerTrustViewTracker } from "@/components/trust/seller-trust-view-tracker";
import { formatSellerTrustForPdp } from "@/lib/trust-safety";
import { cn } from "@/lib/utils";

type SellerTrustScoreBadgeProps = {
  sellerId: string;
  score: number;
  label: string;
  ordersCompleted: number;
  joinedAt: string;
  className?: string;
};

export function SellerTrustScoreBadge({
  sellerId,
  score,
  label,
  ordersCompleted,
  joinedAt,
  className,
}: SellerTrustScoreBadgeProps) {
  const lines = formatSellerTrustForPdp({
    score,
    label,
    ordersCompleted,
    joinedAt,
  });

  return (
    <div
      className={cn(
        "rounded-xl border border-primary/25 bg-primary/5 px-3 py-2.5 text-sm",
        className,
      )}
      data-testid="seller-trust-score"
    >
      <SellerTrustViewTracker sellerId={sellerId} />
      <p className="font-medium text-foreground">
        {lines.headline}
        <span className="ml-2 text-xs font-normal text-muted-foreground">
          {score}/100
        </span>
      </p>
      <p className="mt-1 text-muted-foreground">{lines.salesLine}</p>
      <p className="text-muted-foreground">{lines.joinedLine}</p>
    </div>
  );
}
