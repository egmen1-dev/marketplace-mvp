import type { MobileReleaseChannelId } from "@prisma/client";

/** Client-facing beta channel labels (mobile EXPO_PUBLIC_BETA_CHANNEL). */
export type ClientReleaseChannel =
  | "CLOSED_ALPHA"
  | "CLOSED_BETA"
  | "OPEN_BETA"
  | "RC"
  | "PRODUCTION"
  | string;

/**
 * Map mobile client channel to Mobile Release Platform (Prisma) channel.
 * Closed Beta builds use CLOSED_BETA on the client but BETA in the registry.
 */
export function resolveMRPChannelFromClient(clientChannel?: string | null): MobileReleaseChannelId {
  const normalized = (clientChannel ?? "").trim().toUpperCase();
  switch (normalized) {
    case "CLOSED_BETA":
    case "OPEN_BETA":
      return "BETA";
    case "BETA":
      return "BETA";
    case "RC":
      return "RC";
    case "PRODUCTION":
      return "PRODUCTION";
    case "DEVELOPER":
      return "DEVELOPER";
    case "INTERNAL":
      return "INTERNAL";
    case "OPEN_ALPHA":
      return "OPEN_ALPHA";
    case "CLOSED_ALPHA":
      return "CLOSED_ALPHA";
    default:
      return "CLOSED_ALPHA";
  }
}
