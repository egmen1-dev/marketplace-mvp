import type { QualityScoreExplanation } from "@/lib/marketplace-education/types";

import { EducationTooltip } from "./education-tooltip";

type QualityScoreExplanationPanelProps = {
  explanation: QualityScoreExplanation;
  route: string;
};

export function QualityScoreExplanationPanel({
  explanation,
  route,
}: QualityScoreExplanationPanelProps) {
  return (
    <div
      className="mt-3 space-y-3 rounded-xl border border-border/80 bg-muted/20 p-3"
      data-testid="quality-score-explanation"
    >
      <div className="flex items-center gap-2">
        <p className="text-sm font-medium">
          Почему {explanation.score}/100?
        </p>
        <EducationTooltip
          tooltipId="tooltip-quality-score"
          title="Почему важен балл качества?"
          body="Балл показывает, насколько карточка помогает покупателю принять решение. Он не влияет на ранжирование в поиске."
          route={route}
        />
      </div>
      <ul className="space-y-3 text-sm">
        {explanation.factors.map((factor) => (
          <li key={factor.key} data-testid={`quality-factor-${factor.key}`}>
            <div className="flex justify-between gap-2 font-medium">
              <span>{factor.label}</span>
              <span className="tabular-nums text-muted-foreground">
                {factor.score}/{factor.max}
              </span>
            </div>
            <p className="mt-0.5 text-muted-foreground">{factor.whyImportant}</p>
            {factor.fixHint ? (
              <p className="mt-1 text-foreground">Что исправить: {factor.fixHint}</p>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
