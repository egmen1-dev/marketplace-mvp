import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

import { classifyDependencyLayers } from "./dependency-layers";
import type {
  AdapterBoundaryFinding,
  CcosModuleId,
  DependencyAuditReport,
  DependencyEdge,
  MarketplaceImportViolation,
} from "./types";

const CCOS_ROOT = join(process.cwd(), "lib/ccos");
const ADAPTER_ROOT = join(process.cwd(), "lib/marketplace-cognitive-platform");
const RC_VERSION = "rc-1" as const;

const LAYER_STACK = [
  "Observation",
  "Knowledge",
  "Graph",
  "Twin",
  "Marketplace Brain (adapter)",
  "Publishers / Content Quality / Ranking / Trust",
];

const MODULE_ORDER: CcosModuleId[] = [
  "core",
  "observation",
  "knowledge",
  "graph",
  "twin",
  "product",
  "context",
  "governance",
  "memory",
  "signals",
  "api",
  "rc",
  "simulation",
  "contracts",
  "evolution",
];

function listTsFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) out.push(...listTsFiles(full));
    else if (entry.endsWith(".ts") && !entry.endsWith(".test.ts")) out.push(full);
  }
  return out;
}

function resolveModuleId(filePath: string): CcosModuleId {
  const rel = relative(CCOS_ROOT, filePath);
  const top = rel.split(/[/\\]/)[0];
  if (MODULE_ORDER.includes(top as CcosModuleId)) return top as CcosModuleId;
  if (rel === "flags.ts" || rel === "index.ts" || rel === "telemetry.ts" || rel === "types.ts") {
    return "core";
  }
  if (rel.startsWith("contracts/")) return "contracts";
  if (rel.startsWith("simulation/")) return "simulation";
  if (rel.startsWith("evolution/")) return "evolution";
  return "core";
}

function extractImports(source: string): string[] {
  const imports: string[] = [];
  const re = /from\s+["'](@\/[^"']+)["']/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(source)) !== null) {
    imports.push(match[1]);
  }
  return imports;
}

function importTargetModule(importPath: string): CcosModuleId | null {
  if (!importPath.startsWith("@/lib/ccos/")) return null;
  const rest = importPath.replace("@/lib/ccos/", "");
  const top = rest.split("/")[0];
  if (MODULE_ORDER.includes(top as CcosModuleId)) return top as CcosModuleId;
  return "core";
}

function isMarketplaceImport(importPath: string): boolean {
  return (
    importPath.startsWith("@/lib/marketplace") ||
    importPath.startsWith("@/features/marketplace") ||
    importPath.startsWith("@/lib/marketplace-cognitive-platform")
  );
}

function detectCycles(adj: Map<string, Set<string>>): string[][] {
  const cycles: string[][] = [];
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const stack: string[] = [];

  function dfs(node: string): void {
    if (visited.has(node)) return;
    if (visiting.has(node)) {
      const idx = stack.indexOf(node);
      if (idx >= 0) cycles.push(stack.slice(idx).concat(node));
      return;
    }
    visiting.add(node);
    stack.push(node);
    for (const next of adj.get(node) ?? []) dfs(next);
    stack.pop();
    visiting.delete(node);
    visited.add(node);
  }

  for (const node of adj.keys()) dfs(node);
  return cycles;
}

function auditAdapterBoundaries(): AdapterBoundaryFinding[] {
  if (!statSync(ADAPTER_ROOT, { throwIfNoEntry: false })) return [];
  const files = listTsFiles(ADAPTER_ROOT);
  const findings: AdapterBoundaryFinding[] = [];

  for (const area of ["brain", "graph", "twin", "product"] as const) {
    const areaFiles = files.filter((f) => f.includes(`/${area}/`) || f.endsWith(`/${area}/adapter.ts`));
    if (areaFiles.length === 0) continue;
    const joined = areaFiles.map((f) => readFileSync(f, "utf8")).join("\n");
    findings.push({
      adapter: `marketplace-cognitive-platform/${area}`,
      importsCcos: joined.includes("@/lib/ccos/"),
      importsMarketplaceDomain:
        joined.includes("@/lib/marketplace-ranking-intelligence") ||
        joined.includes("@/lib/marketplace-content-quality") ||
        joined.includes("@/lib/prisma"),
    });
  }

  return findings;
}

export function runCcosDependencyAudit(): DependencyAuditReport {
  const files = listTsFiles(CCOS_ROOT);
  const edges: DependencyEdge[] = [];
  const violations: MarketplaceImportViolation[] = [];
  const adj = new Map<string, Set<string>>();

  for (const mod of MODULE_ORDER) adj.set(mod, new Set());

  for (const file of files) {
    const source = readFileSync(file, "utf8");
    const fromModule = resolveModuleId(file);
    const relFile = relative(process.cwd(), file);

    for (const imp of extractImports(source)) {
      if (isMarketplaceImport(imp)) {
        violations.push({
          file: relFile,
          importPath: imp,
          layer: fromModule,
        });
      }

      const toModule = importTargetModule(imp);
      if (!toModule || toModule === fromModule) continue;

      edges.push({
        from: fromModule,
        to: toModule,
        via: relative(process.cwd(), file),
      });
      adj.get(fromModule)?.add(toModule);
    }
  }

  const cycles = detectCycles(adj);
  const adapterFindings = auditAdapterBoundaries();

  const uniqueEdges = [...new Map(edges.map((e) => [`${e.from}->${e.to}`, e])).values()];

  const draftReport = {
    generatedAt: new Date().toISOString(),
    rcVersion: RC_VERSION,
    modules: MODULE_ORDER,
    edges: uniqueEdges.sort((a, b) => a.from.localeCompare(b.from)),
    layerStack: LAYER_STACK,
    cycles,
    marketplaceViolations: violations,
    adapterFindings,
    passed: cycles.length === 0,
    architectureClean: violations.length === 0,
    summary: {
      cycleCount: cycles.length,
      violationCount: violations.length,
      edgeCount: uniqueEdges.length,
      forbiddenEdgeCount: 0,
    },
  } satisfies Omit<DependencyAuditReport, "layerAnalysis">;

  const layerAnalysis = classifyDependencyLayers(draftReport as DependencyAuditReport);

  return {
    ...draftReport,
    layerAnalysis,
    summary: {
      ...draftReport.summary,
      forbiddenEdgeCount: layerAnalysis.forbiddenViolations.length,
    },
  };
}

export function formatDependencyMap(report: DependencyAuditReport): string {
  const lines = ["Marketplace Brain (adapter)", "↓", "Graph", "↓", "Twin / Product", "↓", "Knowledge", "↓", "Observation", "↓", "Publishers → Content Quality / Ranking / Trust"];

  for (const edge of report.edges) {
    if (edge.from === "graph" && edge.to === "knowledge") {
      lines.splice(4, 0, `  (${edge.from} → ${edge.to})`);
    }
  }

  return lines.join("\n");
}
