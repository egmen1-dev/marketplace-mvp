import type { SellerProgressSignals } from "@/lib/seller-lifecycle/progress";

import { resolveSellerJourneyStep } from "./progress";
import type { SellerJourneyChecklistItem, SellerJourneyStep } from "./types";
import {
  checklistHref,
  JOURNEY_CHECKLIST_DEFINITIONS,
  journeyStepIndex,
} from "./types";

export function buildJourneyChecklist(
  step: SellerJourneyStep,
): SellerJourneyChecklistItem[] {
  const currentIndex = journeyStepIndex(step);

  const items = JOURNEY_CHECKLIST_DEFINITIONS.map((def) => {
    const minIndex = journeyStepIndex(def.minStep);
    return {
      id: def.id,
      label: def.label,
      done: currentIndex >= minIndex,
      current: false,
      href: checklistHref(def.id),
    };
  });

  const firstOpen = items.find((item) => !item.done);
  if (firstOpen) firstOpen.current = true;

  return items;
}

export function computeJourneyProgress(checklist: SellerJourneyChecklistItem[]): {
  current: number;
  total: number;
  percent: number;
} {
  const total = checklist.length;
  const doneCount = checklist.filter((item) => item.done).length;
  const hasCurrent = checklist.some((item) => item.current);
  const current = hasCurrent ? doneCount + 1 : doneCount;
  const percent = total > 0 ? Math.round((doneCount / total) * 100) : 0;
  return { current, total, percent };
}

export function pickNextAction(
  checklist: SellerJourneyChecklistItem[],
): SellerJourneyChecklistItem | null {
  return checklist.find((item) => item.current) ?? checklist.find((item) => !item.done) ?? null;
}

export function resolveChecklistFromSignals(
  signals: SellerProgressSignals,
): SellerJourneyChecklistItem[] {
  return buildJourneyChecklist(resolveSellerJourneyStep(signals));
}
