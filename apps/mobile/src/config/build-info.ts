import { MOBILE_BUILD_INFO } from "./build-info.generated";
import { loadAppConfig } from "./env";

export type MobileBuildInfo = {
  version: string;
  versionName: string;
  versionCode: number;
  commit: string;
  gitSha: string;
  buildDate: string;
  environment: string;
  branch: string;
  packageName: string;
};

export function getMobileBuildInfo(): MobileBuildInfo {
  const config = loadAppConfig();
  const generated = MOBILE_BUILD_INFO;

  return {
    version: generated.version ?? config.appVersion.replace(/-alpha$/, ""),
    versionName: generated.versionName ?? config.appVersion,
    versionCode: generated.versionCode ?? (Number(config.buildNumber) || 1),
    commit: generated.commit ?? "unknown",
    gitSha: generated.gitSha ?? generated.commit ?? "unknown",
    buildDate: generated.buildTime ?? "unknown",
    environment: generated.environment ?? config.releaseChannel,
    branch: generated.branch ?? "unknown",
    packageName: generated.packageName ?? "ru.lot.marketplace.alpha",
  };
}

export function formatBuildDate(iso: string): string {
  if (!iso || iso === "unknown") return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString("ru-RU", { dateStyle: "medium", timeStyle: "short" });
}
