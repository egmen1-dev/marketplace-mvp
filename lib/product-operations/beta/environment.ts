import { getBuildVersionInfo } from "@/lib/build-info";

import type { BetaEnvironmentInfo } from "./types";

export function buildBetaEnvironmentInfo(input?: {
  channel?: string;
  appVersion?: string;
  buildNumber?: number;
  apiBaseUrl?: string;
  expiresAt?: string | null;
}): BetaEnvironmentInfo {
  const build = getBuildVersionInfo();
  const buildNumber = input?.buildNumber ?? 3;
  const expiresAt = input?.expiresAt ?? null;
  const buildExpired = expiresAt ? new Date(expiresAt).getTime() < Date.now() : false;

  return {
    channel: input?.channel ?? "CLOSED_BETA",
    appVersion: input?.appVersion ?? "0.1.2-alpha",
    buildNumber,
    apiBaseUrl: input?.apiBaseUrl ?? process.env.NEXT_PUBLIC_APP_URL ?? "staging",
    environmentLabel: buildExpired ? "BETA_EXPIRED" : "CLOSED_BETA",
    buildExpired,
    expiresAt,
  };
}
