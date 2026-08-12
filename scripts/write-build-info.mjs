/**
 * Embeds commit + build time for /api/version (runs before next build).
 */
import { execSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { join } from "node:path";

function shortSha(raw) {
  const value = raw?.trim();
  if (!value) return undefined;
  return value.slice(0, 7);
}

function resolveCommit() {
  const fromEnv = shortSha(
    process.env.RAILWAY_GIT_COMMIT_SHA ??
      process.env.VERCEL_GIT_COMMIT_SHA ??
      process.env.GIT_COMMIT,
  );
  if (fromEnv) return fromEnv;

  try {
    return shortSha(execSync("git rev-parse HEAD", { encoding: "utf8" }));
  } catch {
    return "unknown";
  }
}

const payload = {
  commit: resolveCommit(),
  buildTime: process.env.BUILD_TIME ?? new Date().toISOString(),
};

const outPath = join(process.cwd(), "lib/build-info.generated.json");
writeFileSync(outPath, `${JSON.stringify(payload, null, 2)}\n`);
console.log("build-info:", payload);
