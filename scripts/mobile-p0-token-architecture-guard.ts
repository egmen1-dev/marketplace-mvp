#!/usr/bin/env tsx
/**
 * P0 — Static token architecture guard
 *
 * Token boundary files may import only other token/config primitives.
 */
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

import { emitReport, mobilePaths, type GateRow } from "./mobile-p0-gate-lib";

function collectTsFiles(dir: string): string[] {
  const out: string[] = [];
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...collectTsFiles(full));
    else if (entry.endsWith(".ts")) out.push(full);
  }
  return out;
}

const FORBIDDEN = [
  { id: "tsx_import", pattern: /from\s+["'][^"']+\.tsx["']/ },
  { id: "design_system_index", pattern: /from\s+["'][^"']*design-system\/index["']/ },
  { id: "design_system_barrel", pattern: /from\s+["'][^"']*design-system["']/ },
  { id: "components_dir", pattern: /from\s+["'][^"']*\/components\// },
  { id: "features_dir", pattern: /from\s+["'][^"']*\/features\// },
  { id: "app_dir", pattern: /from\s+["'][^"']*\/app\// },
];

function main() {
  const { root } = mobilePaths();
  const rows: GateRow[] = [];
  const files = [
    join(root, "apps/mobile/src/theme/tokens.ts"),
    join(root, "apps/mobile/src/theme/status-labels.ts"),
    ...collectTsFiles(join(root, "apps/mobile/src/design-system/tokens")),
  ].filter(existsSync);

  rows.push({
    id: "token_files_discovered",
    ok: files.length >= 9,
    detail: String(files.length),
  });

  for (const file of files) {
    const rel = file.replace(`${root}/`, "");
    const source = readFileSync(file, "utf8");
    for (const rule of FORBIDDEN) {
      rows.push({
        id: `${rel.replace(/\W/g, "_")}_${rule.id}`,
        ok: !rule.pattern.test(source),
        detail: rel,
      });
    }
  }

  emitReport("P0 Token Architecture Guard", rows, { files: files.map((f) => f.replace(`${root}/`, "")) }, "token-architecture-guard-report.json");
}

main();
