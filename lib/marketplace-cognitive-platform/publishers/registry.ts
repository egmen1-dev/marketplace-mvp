import {
  listPublishers,
  registerPublisher,
  resetPublisherRegistry,
} from "@/lib/ccos/observation/registry";

let registered = false;

function registerDefaultPublishers(): void {
  // Lazy requires keep CCOS/brain import graph light in unit tests (fixture publishers only).
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const content = require("./content-quality.publisher") as typeof import("./content-quality.publisher");
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const trust = require("./trust.publisher") as typeof import("./trust.publisher");
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const behaviour = require("./behaviour.publisher") as typeof import("./behaviour.publisher");
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const ranking = require("./ranking.publisher") as typeof import("./ranking.publisher");

  registerPublisher(content.contentQualityPublisher);
  registerPublisher(trust.trustPublisher);
  registerPublisher(behaviour.behaviourPublisher);
  registerPublisher(ranking.rankingPublisher);
}

export function ensureMarketplacePublishersRegistered(): void {
  if (registered) return;
  if (listPublishers().length > 0) {
    registered = true;
    return;
  }
  registerDefaultPublishers();
  registered = true;
}

export function resetMarketplacePublishers(): void {
  resetPublisherRegistry();
  registered = false;
}
