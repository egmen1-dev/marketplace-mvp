import { productFormTips } from "@/lib/marketplace-education/tooltips";

type ProductFormEducationTipsProps = {
  field: "title" | "photos" | "characteristics";
};

export function ProductFormEducationTips({ field }: ProductFormEducationTipsProps) {
  const tip = productFormTips().find((t) => t.field === field);
  if (!tip) return null;

  return (
    <div
      className="rounded-lg border border-sky-500/20 bg-sky-500/5 px-3 py-2 text-xs text-muted-foreground"
      data-testid={`product-form-education-${field}`}
    >
      <p>
        <span className="text-destructive/80">❌ {tip.bad}</span>
        {" · "}
        <span className="text-emerald-700 dark:text-emerald-400">✅ {tip.good}</span>
      </p>
      <p className="mt-1">{tip.why}</p>
    </div>
  );
}
