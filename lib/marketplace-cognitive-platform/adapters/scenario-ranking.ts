import type { RankingProductInput } from "@/lib/marketplace-ranking-intelligence/types";
import type { ScenarioAction, TwinScenario } from "@/lib/ccos/twin/types";

export function applyScenarioToMarketplaceRankingInput(
  input: RankingProductInput,
  scenario: TwinScenario,
): RankingProductInput {
  let next = { ...input };
  for (const action of scenario.actions) {
    next = applyMarketplaceScenarioAction(next, action);
  }
  return next;
}

function applyMarketplaceScenarioAction(
  input: RankingProductInput,
  action: ScenarioAction,
): RankingProductInput {
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
