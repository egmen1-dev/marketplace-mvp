/**
 * Node transport layer mirroring RC10.5 download-apk.ts semantics:
 * - delete existing destination
 * - download with idempotent option (HTTP GET, follow redirects)
 * - SHA256 verify before accepting
 */

import { createHash } from "node:crypto";
import { createWriteStream, existsSync, mkdirSync, rmSync, statSync } from "node:fs";
import { dirname } from "node:path";
import { pipeline } from "node:stream/promises";
import { Readable } from "node:stream";

import { getRc105UpdateErrorMessage, mapRc105UpdateError, type Rc105UpdateFlowError } from "./types";

export type Rc105TransportResult =
  | { ok: true; bytes: number; sha256: string; destination: string }
  | { ok: false; code: Rc105UpdateFlowError; message: string };

export function apkCacheDestination(cacheDir: string, versionCode: number): string {
  return `${cacheDir}/lot-update-${versionCode}.apk`;
}

export async function sha256HexFromFile(path: string): Promise<string> {
  const { readFile } = await import("node:fs/promises");
  const buf = await readFile(path);
  return createHash("sha256").update(buf).digest("hex");
}

export async function sha256HexFromStream(stream: Readable): Promise<string> {
  const hash = createHash("sha256");
  for await (const chunk of stream) {
    hash.update(chunk);
  }
  return hash.digest("hex");
}

export async function downloadVerifiedApkRc105(input: {
  downloadUrl: string;
  expectedSha256: string;
  versionCode: number;
  cacheDir: string;
  timeoutMs?: number;
  userAgent?: string;
}): Promise<Rc105TransportResult> {
  const destination = apkCacheDestination(input.cacheDir, input.versionCode);
  mkdirSync(dirname(destination), { recursive: true });

  if (existsSync(destination)) {
    rmSync(destination, { force: true });
  }

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), input.timeoutMs ?? 300_000);

    const res = await fetch(input.downloadUrl, {
      signal: controller.signal,
      redirect: "follow",
      headers: input.userAgent ? { "User-Agent": input.userAgent } : undefined,
    });
    clearTimeout(timer);

    if (!res.ok || !res.body) {
      throw new Error(`fetch failed status=${res.status}`);
    }

    const writer = createWriteStream(destination);
    await pipeline(Readable.fromWeb(res.body as import("node:stream/web").ReadableStream), writer);

    const actualSha = await sha256HexFromFile(destination);
    const expected = input.expectedSha256.trim().toLowerCase();
    if (actualSha !== expected) {
      rmSync(destination, { force: true });
      throw new Error("sha256_verify_failed");
    }

    const bytes = statSync(destination).size;
    return { ok: true, bytes, sha256: actualSha, destination };
  } catch (err) {
    const code = mapRc105UpdateError(err);
    return { ok: false, code, message: getRc105UpdateErrorMessage(code) };
  }
}

export async function probeDownloadUrl(url: string): Promise<{
  status: number;
  contentType: string | null;
  contentLength: number | null;
  finalUrl: string;
  redirectCount: number;
}> {
  let current = url;
  let redirectCount = 0;
  for (let i = 0; i < 8; i++) {
    const res = await fetch(current, { method: "HEAD", redirect: "manual" });
    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get("location");
      if (!location) break;
      current = new URL(location, current).toString();
      redirectCount += 1;
      continue;
    }
    return {
      status: res.status,
      contentType: res.headers.get("content-type"),
      contentLength: res.headers.get("content-length") ? Number(res.headers.get("content-length")) : null,
      finalUrl: current,
      redirectCount,
    };
  }
  throw new Error("redirect_loop");
}
