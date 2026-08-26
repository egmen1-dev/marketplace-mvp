import { readFileSync } from "node:fs";
import { join } from "node:path";

import type { LotPolicyV2Registry } from "./types";
import { LOT_POLICY_V2_1 } from "./types";

const SUPPORTED_VERSIONS = new Set([LOT_POLICY_V2_1]);

let cached: LotPolicyV2Registry | null = null;

export function loadLotPolicyV2Registry(): LotPolicyV2Registry {
  if (cached) return cached;
  const path = join(process.cwd(), "config/policies/lot-policy-v2.json");
  const raw = JSON.parse(readFileSync(path, "utf8")) as LotPolicyV2Registry;
  if (!SUPPORTED_VERSIONS.has(raw.version)) {
    throw new Error(`Unsupported policy version ${raw.version}; expected ${[...SUPPORTED_VERSIONS].join(" or ")}`);
  }
  cached = raw;
  return raw;
}

export function clearLotPolicyV2Cache(): void {
  cached = null;
}
