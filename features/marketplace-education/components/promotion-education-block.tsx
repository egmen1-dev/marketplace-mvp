import { EDUCATION_CONCEPTS } from "@/lib/marketplace-education/concepts";

import { EducationTooltip } from "./education-tooltip";

type PromotionEducationBlockProps = {
  route: string;
};

export function PromotionEducationBlock({ route }: PromotionEducationBlockProps) {
  return (
    <div
      className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-sm"
      data-testid="promotion-education-block"
    >
      <div className="flex items-center gap-2 font-medium">
        Как работает продвижение
        <EducationTooltip
          tooltipId="tooltip-promotion"
          title="Как работает продвижение"
          body={EDUCATION_CONCEPTS.seller.promotion}
          route={route}
        />
      </div>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-muted-foreground">
        <li>Увеличивает показы товара в каталоге</li>
        <li>Помогает быстрее получить первые продажи</li>
        <li>Не гарантирует покупку — решение остаётся за покупателем</li>
      </ul>
    </div>
  );
}
