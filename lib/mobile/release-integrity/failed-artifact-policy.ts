/**
 * Failed APK diagnostic retention policy.
 *
 * Production: bounded automatic cleanup (immediate delete after failed verify).
 * Acceptance/test: optional quarantine window for byte/SHA forensics.
 */

export type FailedArtifactPolicy = {
  mode: "production" | "acceptance";
  retainFailedApk: boolean;
  retentionMs: number;
  quarantinePrefix: string;
};

const DEFAULT_RETENTION_MS = 30 * 60 * 1000;

export function resolveFailedArtifactPolicy(env: Record<string, string | undefined> = process.env): FailedArtifactPolicy {
  const retainFlag = env.EXPO_PUBLIC_UPDATE_RETAIN_FAILED_APK === "1" || env.LOT_UPDATE_RETAIN_FAILED_APK === "1";
  const retentionMs = Number(env.EXPO_PUBLIC_UPDATE_RETAIN_FAILED_APK_MS ?? env.LOT_UPDATE_RETAIN_FAILED_APK_MS ?? DEFAULT_RETENTION_MS);
  return {
    mode: retainFlag ? "acceptance" : "production",
    retainFailedApk: retainFlag,
    retentionMs: Number.isFinite(retentionMs) && retentionMs > 0 ? retentionMs : DEFAULT_RETENTION_MS,
    quarantinePrefix: "lot-update-failed-",
  };
}

export function describeFailedArtifactPolicy(policy: FailedArtifactPolicy): string {
  if (!policy.retainFailedApk) {
    return "production: delete failed APK immediately after VERIFY_SHA_MISMATCH / VERIFY_IO";
  }
  return `acceptance: quarantine failed APK for ${policy.retentionMs}ms under ${policy.quarantinePrefix}* before cleanup`;
}
