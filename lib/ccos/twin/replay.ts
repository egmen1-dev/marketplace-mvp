import type { TwinReplayEvent } from "./types";
import type { RankingProductInput } from "@/lib/marketplace-ranking-intelligence/types";

export function buildTwinReplayFromHistory(input: {
  rankingInput: RankingProductInput;
  history?: TwinReplayEvent[];
}): TwinReplayEvent[] {
  if (input.history?.length) return input.history;

  const views = Math.max(1, input.rankingInput.views);
  const ctr = Math.round((input.rankingInput.favoritesCount / views) * 1000) / 10;

  return [
    {
      at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString(),
      label: "Baseline snapshot",
      metric: "CTR",
      valueBefore: null,
      valueAfter: ctr,
    },
    {
      at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 14).toISOString(),
      label: "Новое фото",
      metric: "CTR",
      valueBefore: ctr,
      valueAfter: Math.round(ctr * 1.15 * 10) / 10,
      cause: "replace_first_photo",
    },
    {
      at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString(),
      label: "Revenue index",
      metric: "Revenue",
      valueBefore: Math.round(ctr * 10),
      valueAfter: Math.round(ctr * 12.4),
      cause: "ctr_lift",
    },
  ];
}
