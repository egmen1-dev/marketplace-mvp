import type { MobileUpdateState } from "../types";

export type ResolveUpdateStateInput = {
  clientVersionCode: number;
  latestVersionCode: number | null;
  hasDownloadUrl: boolean;
  rolloutEligible: boolean;
  updateRequired: boolean;
  mandatory: boolean;
  forceUpgrade: boolean;
  compatible: boolean;
};

export function resolveUpdateState(input: ResolveUpdateStateInput): MobileUpdateState {
  const hasNewer =
    input.latestVersionCode != null &&
    input.clientVersionCode < input.latestVersionCode &&
    input.hasDownloadUrl &&
    input.rolloutEligible;

  if (!hasNewer) return "NO_UPDATE";
  if (input.updateRequired || input.mandatory || input.forceUpgrade) return "REQUIRED_UPDATE";
  if (!input.compatible) return "RECOMMENDED_UPDATE";
  return "OPTIONAL_UPDATE";
}
