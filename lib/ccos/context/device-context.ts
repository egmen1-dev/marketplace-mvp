import type { DeviceType } from "./types";

export function normalizeDeviceType(value?: string): DeviceType {
  if (!value) return "unknown";
  const v = value.toLowerCase();
  if (v.includes("mobile") || v === "phone") return "mobile";
  if (v.includes("tablet")) return "tablet";
  if (v.includes("desktop")) return "desktop";
  return "unknown";
}

export function buildDeviceContext(device?: DeviceType | string) {
  const type = typeof device === "string" ? normalizeDeviceType(device) : (device ?? "unknown");
  return { type };
}
