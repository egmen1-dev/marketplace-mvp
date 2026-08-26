export const LOT_POLICY_V1 = "LOT_POLICY_V1";
export const LOT_POLICY_V2 = "LOT_POLICY_V2";

export type ModerationAutomationMode = "OFF" | "SHADOW" | "GUARDED_AUTO" | "ENFORCE";

export function getModerationAutomationMode(): ModerationAutomationMode {
  const raw = (process.env.MODERATION_AUTOMATION_MODE ?? "SHADOW").toUpperCase();
  if (raw === "OFF" || raw === "ENFORCE" || raw === "GUARDED_AUTO") return raw;
  return "SHADOW";
}

export function isLotPolicyV2ShadowEnabled(): boolean {
  return process.env.LOT_POLICY_V2_SHADOW !== "false";
}

export const MODERATION_STUCK_THRESHOLD_HOURS = Number(
  process.env.MODERATION_STUCK_THRESHOLD_HOURS ?? "48",
);

export function isLotModerationEngineEnabled(): boolean {
  return process.env.LOT_MODERATION_ENGINE_ENABLED !== "false";
}
