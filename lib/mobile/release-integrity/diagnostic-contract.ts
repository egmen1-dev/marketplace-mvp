import type { UpdateErrorClass } from "../update-journey/error-taxonomy";

/** Internal updater diagnostic subtypes required for release forensics. */
export const REQUIRED_UPDATER_DIAGNOSTIC_CODES = [
  "SHA_API_UNAVAILABLE",
  "VERIFY_IO",
  "VERIFY_SHA_MISMATCH",
  "DOWNLOAD_NETWORK",
  "DOWNLOAD_HTTP",
  "DOWNLOAD_FILESYSTEM",
  "CACHE_CORRUPTED",
] as const;

export type UpdaterDiagnosticSubtype = (typeof REQUIRED_UPDATER_DIAGNOSTIC_CODES)[number];

export type VerifyMismatchDiagnostics = {
  errorClass: "VERIFY_SHA_MISMATCH";
  expectedShaPrefix: string;
  actualShaPrefix: string | null;
  downloadedByteSize: number;
  targetVersionCode: number;
};

export function buildVerifyMismatchDiagnostics(input: {
  expectedSha: string;
  actualSha: string | null;
  downloadedByteSize: number;
  targetVersionCode: number;
}): VerifyMismatchDiagnostics {
  return {
    errorClass: "VERIFY_SHA_MISMATCH",
    expectedShaPrefix: input.expectedSha.slice(0, 12),
    actualShaPrefix: input.actualSha?.slice(0, 12) ?? null,
    downloadedByteSize: input.downloadedByteSize,
    targetVersionCode: input.targetVersionCode,
  };
}

export function mapVerifyIoSubtype(message: string): "SHA_API_UNAVAILABLE" | "VERIFY_IO" {
  if (/readBytes|FileHandle|filesystem api unavailable|not supported/i.test(message)) {
    return "SHA_API_UNAVAILABLE";
  }
  return "VERIFY_IO";
}

export function classifyUpdaterDiagnostic(code: UpdateErrorClass | UpdaterDiagnosticSubtype): string {
  return code;
}

export function verifyDiagnosticContractPresent(sources: string[]): {
  ok: boolean;
  missing: string[];
} {
  const joined = sources.join("\n");
  const missing = REQUIRED_UPDATER_DIAGNOSTIC_CODES.filter((code) => !joined.includes(code));
  return { ok: missing.length === 0, missing };
}
