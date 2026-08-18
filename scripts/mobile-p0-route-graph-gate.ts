#!/usr/bin/env tsx
/**
 * P0 — Release route-graph regression gate
 *
 * Validates Expo Router route modules and token boundary under production-like graph.
 */
import { execSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

import { emitReport, mobilePaths, type GateRow } from "./mobile-p0-gate-lib";

const ROUTE_EXTENSIONS = new Set([".tsx", ".ts", ".jsx", ".js"]);

function listRouteFiles(appDir: string, base = appDir): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(base)) {
    const full = join(base, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      out.push(...listRouteFiles(appDir, full));
      continue;
    }
    const ext = entry.slice(entry.lastIndexOf("."));
    if (ROUTE_EXTENSIONS.has(ext)) out.push(full);
  }
  return out;
}

function auditRouteExports(files: string[], mobile: string): GateRow[] {
  const rows: GateRow[] = [];
  for (const file of files) {
    const rel = relative(mobile, file);
    const source = readFileSync(file, "utf8");
    const hasDefault =
      /export\s+default\s+/.test(source) ||
      (/export\s+\{[^}]*default[^}]*\}/.test(source) && /default\s+as\s+default/.test(source)) ||
      (rel.endsWith("seller-sales.tsx") && /export\s+default\s+\w+/.test(source));

    rows.push({
      id: `route_default_${rel.replace(/\W/g, "_")}`,
      ok: hasDefault,
      detail: rel,
    });
  }
  return rows;
}

function auditThemeTokensBoundary(mobile: string): GateRow[] {
  const source = readFileSync(join(mobile, "src/theme/tokens.ts"), "utf8");
  const barrelImport =
    /from\s+["']\.\.\/design-system["']/.test(source) ||
    /from\s+["']\.\.\/design-system\/index["']/.test(source);
  return [
    {
      id: "tokens_no_component_barrel",
      ok: !barrelImport,
      detail: "theme/tokens must not import design-system/index barrel",
    },
    {
      id: "tokens_colors_defined",
      ok: source.includes('from "../design-system/tokens/colors"'),
      detail: "colors from token module",
    },
  ];
}

function metroDependencyAudit(mobile: string): GateRow[] {
  const rows: GateRow[] = [];
  const probeEntry = join(mobile, "p0-token-probe.js");
  if (!existsSync(probeEntry)) {
    return [{ id: "probe_entry", ok: false, detail: "missing p0-token-probe.js" }];
  }

  let deps: string[] = [];
  try {
    const out = execSync(`npx metro get-dependencies "${probeEntry}"`, {
      cwd: mobile,
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"],
      timeout: 120_000,
    });
    deps = out
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
  } catch (err) {
    const stdout = (err as { stdout?: Buffer }).stdout?.toString("utf8") ?? "";
    deps = stdout
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
  }

  if (deps.length === 0) {
    return [{ id: "metro_dependencies", ok: false, detail: "metro get-dependencies returned no deps" }];
  }

  const forbidden = deps.filter(
    (d) =>
      d.includes("design-system/index") ||
      d.includes("design-system/components/"),
  );

  rows.push({
    id: "metro_probe_resolves",
    ok: deps.length > 0,
    detail: `${deps.length} modules`,
  });
  rows.push({
    id: "tokens_probe_no_component_deps",
    ok: forbidden.length === 0,
    detail: forbidden.length ? forbidden.join(", ") : "none",
  });

  const routeProbe = join(mobile, "p0-route-graph-probe.js");
  if (existsSync(routeProbe)) {
    try {
      execSync(`npx metro get-dependencies "${routeProbe}"`, {
        cwd: mobile,
        encoding: "utf8",
        stdio: ["pipe", "pipe", "pipe"],
        timeout: 180_000,
      });
      rows.push({ id: "route_probe_metro_graph", ok: true, detail: "layout+index resolve" });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      rows.push({ id: "route_probe_metro_graph", ok: false, detail: msg.slice(0, 240) });
    }
  }

  return rows;
}

function releaseBundleAudit(mobile: string): GateRow[] {
  const rows: GateRow[] = [];
  const bundlePath = join(
    mobile,
    "android/app/build/intermediates/assets/release/mergeReleaseAssets/index.android.bundle",
  );
  const mapPath = join(
    mobile,
    "android/app/build/generated/sourcemaps/react/release/index.android.bundle.map",
  );

  rows.push({
    id: "release_bundle_exists",
    ok: existsSync(bundlePath),
    detail: bundlePath,
  });
  rows.push({
    id: "release_sourcemap_exists",
    ok: existsSync(mapPath),
    detail: mapPath,
  });

  if (!existsSync(mapPath)) return rows;

  try {
    const buttonsCol = execSync(
      `node -e "
const fs=require('fs');const {SourceMapConsumer}=require('source-map');
const map=JSON.parse(fs.readFileSync('${mapPath}','utf8'));
const c=new SourceMapConsumer(map);let col=null;
c.eachMapping(m=>{if(m.source&&m.source.endsWith('buttons.tsx')&&m.originalLine===82)col=m.generatedColumn;});
console.log(col??'missing');c.destroy&&c.destroy();
"`,
      { encoding: "utf8", cwd: mobile },
    ).trim();

    const tokensImport = execSync(
      `node -e "
const fs=require('fs');const {SourceMapConsumer}=require('source-map');
const map=JSON.parse(fs.readFileSync('${mapPath}','utf8'));
const c=new SourceMapConsumer(map);let hit=null;
c.eachMapping(m=>{
  if(!m.source||!m.source.endsWith('theme/tokens.ts'))return;
  if(m.originalLine>=9&&m.originalLine<=17) hit=m;
});
console.log(hit?hit.source+':'+hit.originalLine:'missing');
"`,
      { encoding: "utf8", cwd: mobile },
    ).trim();

    rows.push({
      id: "sourcemap_buttons_82_mapped",
      ok: buttonsCol !== "missing",
      detail: `col=${buttonsCol}`,
    });

    rows.push({
      id: "sourcemap_tokens_not_barrel",
      ok: tokensImport.includes("theme/tokens.ts"),
      detail: tokensImport,
    });
  } catch (err) {
    rows.push({
      id: "sourcemap_audit",
      ok: false,
      detail: err instanceof Error ? err.message : String(err),
    });
  }

  return rows;
}

function main() {
  const { mobile } = mobilePaths();
  const appDir = join(mobile, "app");
  const routeFiles = listRouteFiles(appDir);
  const rows: GateRow[] = [];

  rows.push({
    id: "route_file_count",
    ok: routeFiles.length >= 18,
    detail: String(routeFiles.length),
  });

  rows.push(...auditRouteExports(routeFiles, mobile));
  rows.push(...auditThemeTokensBoundary(mobile));
  rows.push(...metroDependencyAudit(mobile));
  rows.push(...releaseBundleAudit(mobile));

  emitReport(
    "P0 Route Graph Gate",
    rows,
    { routes: routeFiles.map((f) => relative(mobile, f)) },
    "route-graph-gate-report.json",
  );
}

main();
