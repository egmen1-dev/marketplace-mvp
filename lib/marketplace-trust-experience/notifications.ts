import { ROUTES } from "@/lib/constants";
import type { TrustScoreHistoryEntry } from "@/lib/marketplace-trust-score/types";

import { historyAdvice } from "./history-timeline";
import type { TrustScoreNotification } from "./types";

export function buildTrustScoreNotifications(
  history: TrustScoreHistoryEntry[],
): TrustScoreNotification[] {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  return history
    .filter((entry) => new Date(entry.createdAt) >= sevenDaysAgo && entry.delta !== 0)
    .slice(0, 3)
    .map((entry) => {
      const isUp = entry.delta > 0;
      return {
        id: `trust-${entry.id}`,
        type: isUp ? "TRUST_SCORE_UP" : "TRUST_SCORE_DOWN",
        title: isUp
          ? `Ваш рейтинг доверия вырос +${entry.delta}`
          : `Рейтинг изменился ${entry.delta}`,
        body: `Причина: ${entry.reason}`,
        action: isUp ? null : historyAdvice(entry),
        href: ROUTES.ACCOUNT_REPUTATION,
        createdAt: entry.createdAt,
        read: false as const,
      };
    });
}
