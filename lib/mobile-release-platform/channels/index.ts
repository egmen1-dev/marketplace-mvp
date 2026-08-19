export { RELEASE_CHANNELS } from "../types";
export type { ReleaseChannelMeta } from "../types";
export { resolveMRPChannelFromClient, type ClientReleaseChannel } from "./resolve-client-channel";

import type { MobileReleaseChannelId } from "@prisma/client";

export function isValidChannel(id: string): id is MobileReleaseChannelId {
  return ["INTERNAL", "DEVELOPER", "CLOSED_ALPHA", "OPEN_ALPHA", "BETA", "RC", "PRODUCTION"].includes(id);
}

export function channelLabel(id: MobileReleaseChannelId): string {
  const map: Record<MobileReleaseChannelId, string> = {
    INTERNAL: "Internal",
    DEVELOPER: "Developer",
    CLOSED_ALPHA: "Closed Alpha",
    OPEN_ALPHA: "Open Alpha",
    BETA: "Beta",
    RC: "RC",
    PRODUCTION: "Production",
  };
  return map[id];
}
