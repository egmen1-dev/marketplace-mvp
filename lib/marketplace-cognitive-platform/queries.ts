import { isCcosEnabled } from "@/lib/ccos/flags";

import { getCognitiveProductReport } from "./brain/report";
import { isMarketplaceCognitivePlatformEnabled } from "./flags";

export function isCognitiveProductReportAvailable(): boolean {
  return isCcosEnabled() && isMarketplaceCognitivePlatformEnabled();
}

export { getCognitiveProductReport };
export type { CognitiveProductReport } from "./brain/types";
export type { GenomeProfile } from "./genome/types";
export { aggregateGenomeFromObservations } from "./genome/aggregate";
export {
  ensureMarketplacePublishersRegistered,
  resetMarketplacePublishers,
} from "./publishers";
