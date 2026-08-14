import type { FirstReviewPromptSnapshot } from "@/lib/marketplace-new-seller-trust/types";

type FirstReviewPromptProps = {
  prompt: FirstReviewPromptSnapshot;
};

export function FirstReviewPrompt({ prompt }: FirstReviewPromptProps) {
  return (
    <div
      className="mb-4 rounded-xl border border-dashed border-primary/30 bg-primary/5 px-4 py-3 text-sm"
      data-testid="first-review-prompt"
    >
      <p className="font-medium">Вы первый покупатель этого товара</p>
      <p className="mt-1 text-muted-foreground">{prompt.message}</p>
    </div>
  );
}
