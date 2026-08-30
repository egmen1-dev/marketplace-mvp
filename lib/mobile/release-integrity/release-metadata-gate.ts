import type { ApkIdentity } from "./apk-inspect";

export type ReleaseManifestLike = {
  packageName?: string;
  versionName?: string;
  versionCode?: number;
  artifact?: {
    sha256?: string;
    sizeBytes?: number;
    fileName?: string;
  };
};

export type ReleaseMetadataGateVerdict = {
  ok: boolean;
  failures: string[];
  checks: Record<string, { expected: string | number | null; actual: string | number | null; pass: boolean }>;
};

const LOT_PACKAGE = "ru.lot.marketplace.alpha";

export function verifyReleaseMetadataGate(
  apk: ApkIdentity,
  manifest: ReleaseManifestLike,
  options?: { expectedPackage?: string },
): ReleaseMetadataGateVerdict {
  const expectedPackage = options?.expectedPackage ?? manifest.packageName ?? LOT_PACKAGE;
  const failures: string[] = [];
  const checks: ReleaseMetadataGateVerdict["checks"] = {};

  const add = (name: string, expected: string | number | null, actual: string | number | null) => {
    const pass = expected == null ? actual != null : expected === actual;
    checks[name] = { expected, actual, pass };
    if (!pass) failures.push(`${name}: expected=${expected} actual=${actual}`);
  };

  add("applicationId", expectedPackage, apk.packageName);
  if (manifest.versionCode != null) add("versionCode", manifest.versionCode, apk.versionCode);
  if (manifest.versionName) add("versionName", manifest.versionName, apk.versionName);
  if (manifest.artifact?.sizeBytes != null) add("artifactSizeBytes", manifest.artifact.sizeBytes, apk.sizeBytes);
  if (manifest.artifact?.sha256) add("sha256", manifest.artifact.sha256.toLowerCase(), apk.sha256.toLowerCase());

  return { ok: failures.length === 0, failures, checks };
}
