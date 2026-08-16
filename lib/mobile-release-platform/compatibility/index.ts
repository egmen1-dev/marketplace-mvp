import { MOBILE_API_VERSION } from "@/lib/mobile/api-contract";
import { getActiveBrainVersion } from "@/lib/ccos/rollback/brain";

import type { ReleaseVersion } from "../types";

export type CompatibilityInput = {
  clientVersionCode: number;
  clientVersionName?: string;
  clientApiVersion?: string;
};

export type CompatibilityResult = {
  minBackendVersion: string;
  minAppVersion: string;
  minApiVersion: string;
  brainVersion: string;
  compatible: boolean;
  forceUpgrade: boolean;
  reasons: string[];
};

function parseVersionCode(name: string): number {
  const m = name.match(/(\d+)/);
  return m ? Number(m[1]) : 0;
}

export function evaluateCompatibility(
  release: ReleaseVersion | null,
  input: CompatibilityInput,
): CompatibilityResult {
  const minAppVersion = release?.minAppVersion ?? "0.0.0-dev";
  const minBackendVersion = release?.minBackendVersion ?? "mobile-v1";
  const minSupportedCode = release?.versionCode ?? 1;
  const reasons: string[] = [];

  let compatible = true;
  let forceUpgrade = false;

  if (input.clientVersionCode < minSupportedCode) {
    compatible = false;
    forceUpgrade = true;
    reasons.push("app_version_below_minimum");
  }

  if (input.clientApiVersion && input.clientApiVersion !== MOBILE_API_VERSION) {
    compatible = false;
    reasons.push("api_version_mismatch");
  }

  if (parseVersionCode(input.clientVersionName ?? "") < parseVersionCode(minAppVersion)) {
    compatible = false;
    reasons.push("app_version_name_below_minimum");
  }

  return {
    minBackendVersion,
    minAppVersion,
    minApiVersion: MOBILE_API_VERSION,
    brainVersion: getActiveBrainVersion(),
    compatible,
    forceUpgrade: forceUpgrade || Boolean(release?.mandatory),
    reasons,
  };
}
