import { File, Paths } from "expo-file-system";

import { resolveFailedArtifactPolicy } from "../../../../lib/mobile/release-integrity/failed-artifact-policy";

export async function quarantineFailedApkIfEnabled(
  file: File,
  context: { versionCode: number; reason: string },
): Promise<"deleted" | "quarantined" | "retained"> {
  const policy = resolveFailedArtifactPolicy();
  if (!policy.retainFailedApk || !file.exists) {
    try {
      if (file.exists) file.delete();
      return "deleted";
    } catch {
      return "retained";
    }
  }

  const quarantine = new File(
    Paths.cache,
    `${policy.quarantinePrefix}${context.versionCode}-${Date.now()}.apk`,
  );
  try {
    file.copy(quarantine);
    file.delete();
    return "quarantined";
  } catch {
    try {
      if (file.exists) file.delete();
    } catch {
      return "retained";
    }
    return "deleted";
  }
}
