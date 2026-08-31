import { File, FileMode } from "expo-file-system";

import {
  APK_SHA_CHUNK_BYTES,
  createIncrementalSha256,
  normalizeSha256Hex,
  sha256Matches,
} from "../../../../lib/mobile/apk-verify/incremental-sha256";

export { normalizeSha256Hex, sha256Matches };

export class ShaVerifyError extends Error {
  readonly code: "VERIFY_SHA_MISMATCH" | "VERIFY_IO" | "SHA_API_UNAVAILABLE" = "VERIFY_SHA_MISMATCH";

  constructor(
    message: string,
    code: "VERIFY_SHA_MISMATCH" | "VERIFY_IO" | "SHA_API_UNAVAILABLE" = "VERIFY_SHA_MISMATCH",
  ) {
    super(message);
    this.name = "ShaVerifyError";
    this.code = code;
  }
}

/** Bounded-memory SHA256 over an on-disk APK via Expo FileHandle.readBytes. */
export async function sha256HexFromFile(file: File): Promise<string> {
  const hasher = createIncrementalSha256();
  const handle = file.open(FileMode.ReadOnly);
  try {
    while (true) {
      const chunk = handle.readBytes(APK_SHA_CHUNK_BYTES);
      if (chunk.byteLength === 0) break;
      hasher.update(chunk);
    }
    return hasher.digestHex();
  } catch (err) {
    const message = err instanceof Error ? err.message : "verify_io_failed";
    const code = /readBytes|FileHandle|not supported|unavailable/i.test(message)
      ? "SHA_API_UNAVAILABLE"
      : "VERIFY_IO";
    throw new ShaVerifyError(message, code);
  } finally {
    handle.close();
  }
}

/** Test-only helper — not used in APK verification path on device. */
export async function sha256HexFromArrayBuffer(buffer: ArrayBuffer): Promise<string> {
  const hasher = createIncrementalSha256();
  hasher.update(new Uint8Array(buffer));
  return hasher.digestHex();
}
