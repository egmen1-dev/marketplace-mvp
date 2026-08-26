import { readFileSync } from "node:fs";
import { join } from "node:path";

import type { LotPolicyV2Registry } from "./types";
import { LOT_POLICY_V2 } from "./types";

let cached: LotPolicyV2Registry | null = null;

export function loadLotPolicyV2Registry(): LotPolicyV2Registry {
  if (cached) return cached;
  const path = join(process.cwd(), "config/policies/lot-policy-v2.json");
  const raw = JSON.parse(readFileSync(path, "utf8")) as LotPolicyV2Registry;
  if (raw.version !== LOT_POLICY_V2) {
    throw new Error(`Expected policy version ${LOT_POLICY_V2}, got ${raw.version}`);
  }
  cached = raw;
  return raw;
}

export function clearLotPolicyV2Cache(): void {
  cached = null;
}
