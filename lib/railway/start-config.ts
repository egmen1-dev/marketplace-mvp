import { readFileSync } from "node:fs";
import { join } from "node:path";

/** Canonical migration-aware Railway container entrypoint (copied to /app in Dockerfile). */
export const CANONICAL_RAILWAY_START_COMMAND = "./docker-entrypoint.sh";

/** Legacy direct Next.js boot — bypasses prisma migrate deploy on container start. */
export const LEGACY_RAILWAY_START_COMMAND = "node server.js";

export type RailwayStartConfigCheck = {
  id: string;
  ok: boolean;
  detail: string;
};

export type RailwayStartConfigReport = {
  startCommand: string | null;
  checks: RailwayStartConfigCheck[];
  verdict: "PASS" | "FAIL";
};

function readRepoFile(path: string): string {
  return readFileSync(join(process.cwd(), path), "utf8");
}

export function parseRailwayStartCommand(railwayToml: string): string | null {
  const deploySection = railwayToml.match(/\[deploy\][\s\S]*?(?=\n\[|$)/);
  if (!deploySection) return null;
  const match = deploySection[0].match(/^\s*startCommand\s*=\s*"([^"]+)"/m);
  return match?.[1] ?? null;
}

export function verifyRailwayStartConfig(): RailwayStartConfigReport {
  const railwayToml = readRepoFile("railway.toml");
  const dockerfile = readRepoFile("Dockerfile");
  const entrypoint = readRepoFile("scripts/docker-entrypoint.sh");

  const startCommand = parseRailwayStartCommand(railwayToml);
  const checks: RailwayStartConfigCheck[] = [];

  checks.push({
    id: "railway_toml_start_command",
    ok: startCommand === CANONICAL_RAILWAY_START_COMMAND,
    detail:
      startCommand === CANONICAL_RAILWAY_START_COMMAND
        ? `startCommand=${startCommand}`
        : `Expected startCommand=${CANONICAL_RAILWAY_START_COMMAND}, got ${startCommand ?? "missing"}`,
  });

  checks.push({
    id: "not_legacy_node_server",
    ok: startCommand !== LEGACY_RAILWAY_START_COMMAND,
    detail:
      startCommand === LEGACY_RAILWAY_START_COMMAND
        ? "Direct node server.js bypasses prisma migrate deploy on boot"
        : "startCommand is not legacy node server.js",
  });

  checks.push({
    id: "entrypoint_exists",
    ok: entrypoint.includes("[entrypoint]") && entrypoint.includes("prisma migrate deploy"),
    detail: "scripts/docker-entrypoint.sh runs prisma migrate deploy before node server.js",
  });

  checks.push({
    id: "entrypoint_exec_server",
    ok: /exec\s+node\s+server\.js/.test(entrypoint),
    detail: "Entrypoint exec node server.js after migration",
  });

  checks.push({
    id: "dockerfile_copies_entrypoint",
    ok:
      dockerfile.includes("COPY scripts/docker-entrypoint.sh ./docker-entrypoint.sh") &&
      dockerfile.includes('CMD ["./docker-entrypoint.sh"]'),
    detail: "Dockerfile copies entrypoint to /app/docker-entrypoint.sh and uses it as CMD",
  });

  checks.push({
    id: "dockerfile_prisma_runtime",
    ok:
      dockerfile.includes("COPY --from=builder /app/prisma ./prisma") &&
      dockerfile.includes("COPY --from=deps /app/node_modules/prisma ./node_modules/prisma"),
    detail: "Dockerfile runner stage includes Prisma schema, CLI, and client runtime",
  });

  const verdict = checks.every((check) => check.ok) ? "PASS" : "FAIL";

  return { startCommand, checks, verdict };
}
