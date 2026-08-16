import type { MobileReleaseChannelId, MobileReleaseStatus } from "@prisma/client";

export type ReleaseVersion = {
  id: string;
  versionName: string;
  versionCode: number;
  gitCommit: string;
  sha256: string;
  channel: MobileReleaseChannelId;
  releaseNotes: string;
  publishedAt: string | null;
  minBackendVersion: string;
  minAppVersion: string;
  buildNumber: string;
  status: MobileReleaseStatus;
  downloadUrl: string | null;
  artifactSizeBytes: number | null;
  rolloutPercent: number;
  mandatory: boolean;
  packageId: string;
};

export type MobileUpdatePayload = {
  latestVersion: string;
  versionCode: number;
  versionName: string;
  minimumVersion: string;
  minimumSupportedVersionCode: number;
  updateRequired: boolean;
  mandatory: boolean;
  downloadUrl: string | null;
  sha256: string | null;
  releaseNotes: string[];
  channel: MobileReleaseChannelId;
  rollout: { percent: number; eligible: boolean };
  compatibility: {
    minBackendVersion: string;
    minAppVersion: string;
    minApiVersion: string;
    compatible: boolean;
    forceUpgrade: boolean;
  };
  publishedAt: string | null;
  advisoryOnly: true;
};

export type ReleaseAnalyticsSummary = {
  installs: number;
  active: number;
  updates: number;
  crashes: number;
  sessions: number;
};

export type ReleaseChannelMeta = {
  id: MobileReleaseChannelId;
  label: string;
  description: string;
  order: number;
};

export const ROLLOUT_STEPS = [10, 30, 50, 100] as const;

export const RELEASE_CHANNELS: ReleaseChannelMeta[] = [
  { id: "INTERNAL", label: "Internal", description: "Team only", order: 0 },
  { id: "DEVELOPER", label: "Developer", description: "Engineering builds", order: 1 },
  { id: "CLOSED_ALPHA", label: "Closed Alpha", description: "5–10 invited testers", order: 2 },
  { id: "OPEN_ALPHA", label: "Open Alpha", description: "Broader alpha", order: 3 },
  { id: "BETA", label: "Beta", description: "Pre-release beta", order: 4 },
  { id: "RC", label: "RC", description: "Release candidate", order: 5 },
  { id: "PRODUCTION", label: "Production", description: "Store / production", order: 6 },
];

export type AndroidUpdatePayload = Awaited<ReturnType<typeof import("./update-service").buildLegacyAndroidUpdatePayload>>;
