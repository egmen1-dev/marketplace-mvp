import { ROUTES } from "@/lib/constants";
import type { SellerJourneyCoach } from "@/lib/seller-journey/types";

import type { OperatingDeskAction, OperatingDeskIssue } from "./types";

export function buildTodayActions(input: {
  issues: OperatingDeskIssue[];
  coach: SellerJourneyCoach | null;
}): OperatingDeskAction[] {
  const actions: OperatingDeskAction[] = [];
  let priority = 1;

  if (input.coach?.ctaHref) {
    actions.push({
      id: "journey-coach",
      priority: priority++,
      title: input.coach.headline,
      why: input.coach.why,
      ctaLabel: input.coach.ctaLabel,
      ctaHref: input.coach.ctaHref,
    });
  }

  for (const issue of input.issues.slice(0, 4)) {
    if (actions.some((a) => a.ctaHref === issue.ctaHref)) continue;
    actions.push({
      id: `issue-${issue.id}`,
      priority: priority++,
      title: issue.title,
      why: issue.why,
      ctaLabel: issue.ctaLabel,
      ctaHref: issue.ctaHref,
    });
  }

  if (actions.length === 0) {
    actions.push({
      id: "default-grow",
      priority: 1,
      title: "Проверить рекомендации по росту",
      why: "Регулярный обзор помогает находить точки роста.",
      ctaLabel: "AI помощник",
      ctaHref: ROUTES.ACCOUNT_GROWTH,
    });
  }

  return actions.slice(0, 5);
}
