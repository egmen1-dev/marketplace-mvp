type PdpDeliveryHintProps = {
  headline: string;
  subline: string;
};

export function PdpDeliveryHint({ headline, subline }: PdpDeliveryHintProps) {
  return (
    <div
      className="rounded-xl border border-border/80 bg-surface/40 p-3 text-sm"
      data-testid="pdp-delivery-hint"
    >
      <p className="font-medium text-foreground">Доставка: {headline}</p>
      <p className="mt-1 text-muted-foreground">{subline}</p>
    </div>
  );
}
