import { readFileSync } from "node:fs";
import { join } from "node:path";

import packageJson from "../package.json";

/** Runtime deployment tier — no secrets. */
export type AppEnvironment = "staging" | "production" | "development";

export type BuildVersionInfo = {
  commit: string;
  buildTime: string;
};

export type BuildInfoResponse = BuildVersionInfo & {
  environment: AppEnvironment;
  version: string;
};

type GeneratedBuildInfo = {
  commit?: string;
  buildTime?: string;
};

let cachedGenerated: GeneratedBuildInfo | null | undefined;

function readGeneratedBuildInfo(): GeneratedBuildInfo | null {
  if (cachedGenerated !== undefined) return cachedGenerated;
  try {
    const raw = readFileSync(
      join(process.cwd(), "lib/build-info.generated.json"),
      "utf8",
    );
    cachedGenerated = JSON.parse(raw) as GeneratedBuildInfo;
  } catch {
    cachedGenerated = null;
  }
  return cachedGenerated;
}

/** Reset module cache — tests only. */
export function __resetBuildInfoCacheForTests(): void {
  cachedGenerated = undefined;
}

function normalizeCommit(raw: string | undefined): string | undefined {
  const trimmed = raw?.trim();
  if (!trimmed) return undefined;
  return trimmed.slice(0, 7);
}

function resolveCommit(): string {
  const generated = readGeneratedBuildInfo();
  const candidates = [
    generated?.commit,
    process.env.GIT_COMMIT,
    process.env.RAILWAY_GIT_COMMIT_SHA,
    process.env.VERCEL_GIT_COMMIT_SHA,
    process.env.NEXT_PUBLIC_GIT_COMMIT,
  ];
  for (const value of candidates) {
    const short = normalizeCommit(value);
    if (short) return short;
  }
  return "unknown";
}

function resolveBuildTime(): string {
  const generated = readGeneratedBuildInfo();
  const candidates = [generated?.buildTime, process.env.BUILD_TIME];
  for (const value of candidates) {
    const trimmed = value?.trim();
    if (trimmed) return trimmed;
  }
  return "unknown";
}

/**
 * Resolve deployment environment at runtime.
 * Railway backup host → staging; Vercel production → production.
 */
export function getAppEnvironment(): AppEnvironment {
  const explicit = process.env.APP_ENV?.trim().toLowerCase();
  if (explicit === "staging" || explicit === "production" || explicit === "development") {
    return explicit;
  }

  if (process.env.RAILWAY_ENVIRONMENT || process.env.RAILWAY_PUBLIC_DOMAIN) {
    return "staging";
  }

  if (process.env.VERCEL === "1") {
    const vercelEnv = process.env.VERCEL_ENV?.trim().toLowerCase();
    if (vercelEnv === "production") return "production";
    if (vercelEnv === "preview" || vercelEnv === "development") return "staging";
    return "production";
  }

  if (process.env.NODE_ENV === "production") {
    return "development";
  }

  return "development";
}

/** Public build marker — safe for load balancers and deploy scripts. */
export function getBuildInfo(): BuildInfoResponse {
  return {
    environment: getAppEnvironment(),
    commit: resolveCommit(),
    buildTime: resolveBuildTime(),
    version: packageJson.version,
  };
}

export function getBuildVersionInfo(): BuildVersionInfo {
  const { commit, buildTime } = getBuildInfo();
  return { commit, buildTime };
}
