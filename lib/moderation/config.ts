export const LOT_POLICY_V1 = "LOT_POLICY_V1";

export type ModerationAutomationMode = "OFF" | "SHADOW" | "ENFORCE";

export function getModerationAutomationMode(): ModerationAutomationMode {
  const raw = (process.env.MODERATION_AUTOMATION_MODE ?? "SHADOW").toUpperCase();
  if (raw === "OFF" || raw === "ENFORCE") return raw;
  return "SHADOW";
}

export const MODERATION_STUCK_THRESHOLD_HOURS = Number(
  process.env.MODERATION_STUCK_THRESHOLD_HOURS ?? "48",
);

export function isLotModerationEngineEnabled(): boolean {
  return process.env.LOT_MODERATION_ENGINE_ENABLED !== "false";
}
