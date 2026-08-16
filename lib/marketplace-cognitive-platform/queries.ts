import { isCcosEnabled } from "@/lib/ccos/flags";

import { getMarketplaceBrainReport } from "./brain/v1/report";
import { getCognitiveProductReport } from "./brain/report";
import { isMarketplaceCognitivePlatformEnabled } from "./flags";

export function isCognitiveProductReportAvailable(): boolean {
  return isCcosEnabled() && isMarketplaceCognitivePlatformEnabled();
}

export { getCognitiveProductReport, getMarketplaceBrainReport };
export type { CognitiveProductReport } from "./brain/types";
export type {
  MarketplaceBrainReport,
  MarketplaceBrainContextInput,
} from "./brain/v1/types";
export type { GenomeProfile } from "./genome/types";
export { aggregateGenomeFromObservations } from "./genome/aggregate";
export {
  ensureMarketplacePublishersRegistered,
  resetMarketplacePublishers,
} from "./publishers";
