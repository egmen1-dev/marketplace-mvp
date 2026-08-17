#!/usr/bin/env tsx
/**
 * P0 — Token dependency cycle gate
 *
 * Hard FAIL if theme/tokens.ts participates in any circular dependency,
 * or if it imports the design-system component barrel.
 */
import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { emitReport, mobilePaths, type GateRow } from "./mobile-p0-gate-lib";

const FORBIDDEN_IMPORT_PATTERNS = [
  /from\s+["'][^"']*design-system\/index["']/,
  /from\s+["'][^"']*design-system["']/,
  /from\s+["'][^"']*design-system\/components/,
  /from\s+["'][^"']*components\/ui/,
  /from\s+["'][^"']*components\//,
  /from\s+["'][^"']*features\//,
  /from\s+["'][^"']*app\//,
];

const PUBLIC_EXPORTS = [
  "brand",
  "accent",
  "semantic",
  "surface",
  "text",
  "border",
  "colors",
  "typography",
  "spacing",
  "radii",
  "shadows",
  "elevation",
  "blur",
  "opacity",
  "borders",
  "gradients",
  "layout",
  "DESIGN_SYSTEM_VERSION",
] as const;

function auditThemeTokensSource(mobile: string): GateRow[] {
  const path = join(mobile, "src/theme/tokens.ts");
  const source = readFileSync(path, "utf8");
  const rows: GateRow[] = [];

  rows.push({
    id: "theme_tokens_no_barrel_import",
    ok:
      !/from\s+["']\.\.\/design-system["']/.test(source) &&
      !/from\s+["']\.\.\/design-system\/index["']/.test(source),
    detail: "must not import design-system/index barrel",
  });

  for (const pattern of FORBIDDEN_IMPORT_PATTERNS) {
    rows.push({
      id: `theme_tokens_forbidden_${pattern.source.slice(0, 24).replace(/\W/g, "_")}`,
      ok: !pattern.test(source),
      detail: pattern.source,
    });
  }

  rows.push({
    id: "theme_tokens_token_only_imports",
    ok: (source.match(/from\s+["']\.\.\/design-system\/tokens\//g) ?? []).length >= 8,
    detail: "imports only from design-system/tokens/*",
  });

  for (const name of PUBLIC_EXPORTS) {
    rows.push({
      id: `public_export_${name}`,
      ok: source.includes(name),
      detail: name,
    });
  }

  return rows;
}

function runMadgeCycles(mobile: string): { rows: GateRow[]; cycles: string[][] } {
  const rows: GateRow[] = [];
  let cycles: string[][] = [];

  try {
    const out = execSync(
      `npx madge --circular --extensions ts,tsx --json src/theme/tokens.ts src/design-system src/components/ui app`,
      { cwd: mobile, encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] },
    );
    cycles = JSON.parse(out || "[]") as string[][];
  } catch (err) {
    const stdout = (err as { stdout?: Buffer }).stdout?.toString("utf8") ?? "[]";
    try {
      cycles = JSON.parse(stdout || "[]") as string[][];
    } catch {
      cycles = [];
    }
  }

  const themeCycles = cycles.filter((cycle) =>
    cycle.some((file) => file.includes("theme/tokens") || file.endsWith("tokens.ts")),
  );

  rows.push({
    id: "theme_tokens_cycle_count",
    ok: themeCycles.length === 0,
    detail: themeCycles.length === 0 ? "0 cycles" : JSON.stringify(themeCycles),
  });

  rows.push({
    id: "no_theme_to_design_system_index",
    ok: !cycles.some((cycle) =>
      cycle.some((a, i) => {
        const b = cycle[(i + 1) % cycle.length];
        return a.includes("theme/tokens") && b.includes("design-system/index");
      }),
    ),
    detail: `total_cycles=${cycles.length}`,
  });

  return { rows, cycles };
}

function auditTokenFiles(mobile: string): GateRow[] {
  const rows: GateRow[] = [];
  const tokenDir = join(mobile, "src/design-system/tokens");
  if (!existsSync(tokenDir)) {
    return [{ id: "token_dir", ok: false, detail: tokenDir }];
  }

  const files = execSync(`find "${tokenDir}" -name '*.ts'`, { encoding: "utf8" })
    .trim()
    .split("\n")
    .filter(Boolean);

  for (const file of files) {
    const rel = file.replace(`${mobile}/`, "");
    const source = readFileSync(file, "utf8");
    const forbidden =
      /\.tsx["']/.test(source) ||
      /from\s+["'][^"']*design-system\/index/.test(source) ||
      /from\s+["'][^"']*components\//.test(source) ||
      /from\s+["'][^"']*features\//.test(source) ||
      /from\s+["'][^"']*app\//.test(source);
    rows.push({
      id: `token_file_${rel.split("/").pop()?.replace(".", "_")}`,
      ok: !forbidden,
      detail: rel,
    });
  }

  return rows;
}

function main() {
  const { mobile } = mobilePaths();
  const rows: GateRow[] = [];

  rows.push(...auditThemeTokensSource(mobile));
  rows.push(...auditTokenFiles(mobile));

  const { rows: madgeRows, cycles } = runMadgeCycles(mobile);
  rows.push(...madgeRows);

  emitReport(
    "P0 Token Dependency Cycle Gate",
    rows,
    {
      themeTokenCycles: cycles.filter((c) => c.some((f) => f.includes("tokens.ts"))),
      allCycles: cycles,
    },
    "token-cycle-gate-report.json",
  );
}

main();
