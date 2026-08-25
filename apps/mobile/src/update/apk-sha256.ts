import { File } from "expo-file-system";

function bytesToHex(bytes: Uint8Array): string {
  return [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function sha256HexFromArrayBuffer(buffer: ArrayBuffer): Promise<string> {
  if (typeof globalThis.crypto?.subtle?.digest === "function") {
    const digest = await globalThis.crypto.subtle.digest("SHA-256", buffer);
    return bytesToHex(new Uint8Array(digest));
  }
  throw new Error("sha256_unavailable");
}

export async function sha256HexFromFile(file: File): Promise<string> {
  return sha256HexFromArrayBuffer(await file.arrayBuffer());
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
