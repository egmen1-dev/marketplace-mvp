type JwtPayload = {
  exp?: number;
  sub?: string;
};

function decodeBase64(value: string): string {
  if (typeof globalThis.atob === "function") {
    return globalThis.atob(value);
  }
  throw new Error("base64 decode unavailable");
}

export function decodeJwtPayload(token: string): JwtPayload | null {
  const parts = token.split(".");
  if (parts.length < 2) return null;
  try {
    const normalized = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
    const json = decodeBase64(padded);
    return JSON.parse(json) as JwtPayload;
  } catch {
    return null;
  }
}
