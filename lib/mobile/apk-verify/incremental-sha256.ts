import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex } from "@noble/hashes/utils.js";

export const APK_SHA_CHUNK_BYTES = 256 * 1024;

export type IncrementalSha256 = {
  update(chunk: Uint8Array): void;
  digestHex(): string;
};

export function createIncrementalSha256(): IncrementalSha256 {
  const hasher = sha256.create();
  return {
    update(chunk: Uint8Array) {
      hasher.update(chunk);
    },
    digestHex() {
      return bytesToHex(hasher.digest());
    },
  };
}

export async function sha256HexFromArrayBuffer(buffer: ArrayBuffer): Promise<string> {
  const hasher = createIncrementalSha256();
  hasher.update(new Uint8Array(buffer));
  return hasher.digestHex();
}

export async function sha256HexFromChunkIterable(
  chunks: AsyncIterable<Uint8Array>,
): Promise<string> {
  const hasher = createIncrementalSha256();
  for await (const chunk of chunks) {
    if (chunk.byteLength > 0) {
      hasher.update(chunk);
    }
  }
  return hasher.digestHex();
}

export function normalizeSha256Hex(value: string | null | undefined): string | null {
  if (!value) return null;
  const normalized = value.trim().toLowerCase();
  return /^[a-f0-9]{64}$/.test(normalized) ? normalized : null;
}

export function sha256Matches(actual: string, expected: string): boolean {
  const left = normalizeSha256Hex(actual);
  const right = normalizeSha256Hex(expected);
  return Boolean(left && right && left === right);
}
