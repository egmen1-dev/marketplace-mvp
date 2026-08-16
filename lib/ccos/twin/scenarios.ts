import type { RankingProductInput } from "@/lib/marketplace-ranking-intelligence/types";
import type { ScenarioAction, TwinScenario } from "./types";

export const DEFAULT_SCENARIOS: TwinScenario[] = [
  {
    id: "scenario_photo",
    label: "Заменить первое фото",
    type: "replace_first_photo",
    actions: [{ type: "replace_first_photo" }],
  },
  {
    id: "scenario_video",
    label: "Добавить видео",
    type: "add_video",
    actions: [{ type: "add_video" }],
  },
  {
    id: "scenario_price_3",
    label: "Снизить цену на 3%",
    type: "change_price",
    actions: [{ type: "change_price", params: { percent: -3 } }],
  },
  {
    id: "scenario_price_15",
    label: "Снизить цену на 15%",
    type: "change_price",
    actions: [{ type: "change_price", params: { percent: -15 } }],
  },
  {
    id: "scenario_seo",
    label: "Улучшить SEO",
    type: "change_seo",
    actions: [{ type: "change_seo" }],
  },
  {
    id: "scenario_promotion",
    label: "Включить продвижение",
    type: "enable_promotion",
    actions: [{ type: "enable_promotion" }],
  },
  {
    id: "scenario_description",
    label: "Улучшить описание",
    type: "improve_description",
    actions: [{ type: "improve_description" }],
  },
  {
    id: "scenario_reorder",
    label: "Изменить порядок фотографий",
    type: "reorder_photos",
    actions: [{ type: "reorder_photos" }],
  },
  {
    id: "scenario_combo",
    label: "Фото + цена -3%",
    type: "combined",
    actions: [
      { type: "replace_first_photo" },
      { type: "change_price", params: { percent: -3 } },
    ],
  },
];

export function resolveScenarios(scenarioIds?: string[]): TwinScenario[] {
  if (!scenarioIds?.length) return DEFAULT_SCENARIOS;
  const set = new Set(scenarioIds);
  const picked = DEFAULT_SCENARIOS.filter((s) => set.has(s.id));
  return picked.length > 0 ? picked : DEFAULT_SCENARIOS;
}

export function applyScenarioToRankingInput(
  input: RankingProductInput,
  scenario: TwinScenario,
): RankingProductInput {
  let next = { ...input };

  for (const action of scenario.actions) {
    next = applyAction(next, action);
  }
  return next;
}

function applyAction(input: RankingProductInput, action: ScenarioAction): RankingProductInput {
  const next = { ...input };
  switch (action.type) {
    case "replace_first_photo":
      next.photoCount = Math.max(next.photoCount, 5);
      next.photoQuality = Math.min(100, (next.photoQuality ?? 55) + 18);
      next.thumbnailQuality = Math.min(100, (next.thumbnailQuality ?? next.photoQuality ?? 55) + 15);
      next.photoRelevance = Math.min(100, (next.photoRelevance ?? 50) + 12);
      break;
    case "add_video":
      next.hasVideo = true;
      next.videoQuality = Math.min(100, (next.videoQuality ?? 60) + 20);
      next.photoCount = Math.max(next.photoCount, 4);
      break;
    case "change_price": {
      const pct = Number(action.params?.percent ?? -5);
      if (pct < 0) {
        next.compareAt = next.price;
        next.price = Math.round(next.price * (1 + pct / 100));
      } else if (pct > 0) {
        next.price = Math.round(next.price * (1 + pct / 100));
      }
      break;
    }
    case "change_seo":
      next.seoTitleLength = Math.max(next.seoTitleLength, 24);
      next.seoDescriptionLength = Math.max(next.seoDescriptionLength, 80);
      next.seoQuality = Math.min(100, (next.seoQuality ?? 50) + 22);
      break;
    case "enable_promotion":
      next.promotionActive = true;
      break;
    case "improve_description":
      next.descriptionLength = Math.max(next.descriptionLength, 140);
      next.descriptionQuality = Math.min(100, (next.descriptionQuality ?? 50) + 20);
      break;
    case "reorder_photos":
      next.photoQuality = Math.min(100, (next.photoQuality ?? 50) + 10);
      next.thumbnailQuality = Math.min(100, (next.thumbnailQuality ?? 50) + 12);
      break;
    case "combined":
      break;
    default:
      break;
  }
  return next;
}

export function scenarioToRankingSimulateInput(scenario: TwinScenario) {
  const hasPhoto = scenario.actions.some((a) => a.type === "replace_first_photo" || a.type === "reorder_photos");
  const hasVideo = scenario.actions.some((a) => a.type === "add_video");
  const priceAction = scenario.actions.find((a) => a.type === "change_price");
  const pct = priceAction?.params?.percent;
  return {
    improveFirstPhoto: hasPhoto,
    addVideo: hasVideo,
    reducePricePercent: typeof pct === "number" && pct < 0 ? Math.abs(pct) : undefined,
  };
}
