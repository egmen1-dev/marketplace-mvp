import { readFileSync } from "node:fs";

const PRODUCTION_VERIFY_PATHS = [
  "apps/mobile/src/update/apk-sha256.ts",
  "apps/mobile/src/update/download-apk.ts",
  "apps/mobile/src/update/apk-download-cache.ts",
];

const FORBIDDEN_PATTERNS = [
  { pattern: /file\.arrayBuffer\s*\(/i, label: "file.arrayBuffer()" },
  { pattern: /readAsStringAsync\s*\([^)]*base64/i, label: "base64 whole-file read" },
];

export function verifyUpdaterHashGuard(): {
  ok: boolean;
  chunkedHashingPresent: boolean;
  wholeFileArrayBufferHashing: boolean;
  failures: string[];
} {
  const failures: string[] = [];
  let chunkedHashingPresent = false;
  let wholeFileArrayBufferHashing = false;

  const apkSha = readFileSync("apps/mobile/src/update/apk-sha256.ts", "utf8");
  chunkedHashingPresent = apkSha.includes("readBytes") && apkSha.includes("APK_SHA_CHUNK_BYTES");
  if (!chunkedHashingPresent) failures.push("chunked readBytes hashing missing in apk-sha256.ts");

  for (const rel of PRODUCTION_VERIFY_PATHS) {
    const source = readFileSync(rel, "utf8");
    for (const forbidden of FORBIDDEN_PATTERNS) {
      if (forbidden.pattern.test(source)) {
        wholeFileArrayBufferHashing = true;
        failures.push(`${rel}: forbidden whole-file pattern ${forbidden.label}`);
      }
    }
  }

  if (apkSha.includes("sha256HexFromArrayBuffer")) {
    const annotatedTestOnly = /Test-only helper[\s\S]*sha256HexFromArrayBuffer/.test(apkSha);
    if (!annotatedTestOnly) {
      failures.push("apk-sha256.ts exposes arrayBuffer helper without test-only guard");
    }
  }

  return {
    ok: failures.length === 0,
    chunkedHashingPresent,
    wholeFileArrayBufferHashing,
    failures,
  };
}
