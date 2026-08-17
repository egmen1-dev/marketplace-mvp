import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import {
  computeMarketplaceFeeling,
  computeMarketplaceScore,
  type MarketplaceQualityAuditFile,
  type MarketplaceScreenAudit,
} from "./criteria";
import { detectCrudForFiles, screenFailsCrudCheck } from "./crud-detection";
import { MARKETPLACE_SCREENS } from "./screens";

export const DEFAULT_AUDIT_PATH = "artifacts/epic-84-wave-0/marketplace-quality-audit.json";

export function createEmptyAuditFile(): MarketplaceQualityAuditFile {
  const screens: MarketplaceScreenAudit[] = MARKETPLACE_SCREENS.map((def) => ({
    screenId: def.id,
    name: def.name,
    route: def.route,
    scoresBefore: {},
    scoresAfter: null,
    marketplaceFeelingBefore: null,
    marketplaceFeelingAfter: null,
    marketplaceScoreBefore: null,
    marketplaceScoreAfter: null,
    crudDetected: screenFailsCrudCheck(def.sourceFiles),
    issues: [],
  }));

  return {
    epic: "EPIC-84",
    wave: 0,
    designSystemVersion: "1.0.0",
    auditStatus: "NOT_STARTED",
    generatedAt: null,
    screens,
    summary: {
      p0: 0,
      p1: 0,
      p2: 0,
      screensAudited: 0,
      screensTotal: screens.length,
      marketplaceQualityIndexBefore: null,
      marketplaceQualityIndexAfter: null,
      marketplaceFeelingDelta: null,
    },
  };
}

export function loadMarketplaceQualityAudit(path = DEFAULT_AUDIT_PATH, root = process.cwd()): MarketplaceQualityAuditFile {
  const full = join(root, path);
  const base = createEmptyAuditFile();
  if (!existsSync(full)) return base;

  const parsed = JSON.parse(readFileSync(full, "utf8")) as MarketplaceQualityAuditFile;
  const byId = new Map(parsed.screens.map((s) => [s.screenId, s]));

  return {
    ...base,
    ...parsed,
    screens: base.screens.map((screen) => {
      const existing = byId.get(screen.screenId);
      return existing ? { ...screen, ...existing } : screen;
    }),
  };
}

export function saveMarketplaceQualityAudit(data: MarketplaceQualityAuditFile, path = DEFAULT_AUDIT_PATH, root = process.cwd()) {
  writeFileSync(join(root, path), JSON.stringify(data, null, 2));
}

function indexFromScreens(screens: MarketplaceScreenAudit[], phase: "before" | "after"): number | null {
  const values = screens
    .map((s) => (phase === "before" ? s.marketplaceScoreBefore : s.marketplaceScoreAfter))
    .filter((v): v is number => typeof v === "number");
  if (values.length === 0) return null;
  return Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 100) / 100;
}

export function enrichAuditFile(audit: MarketplaceQualityAuditFile): MarketplaceQualityAuditFile {
  const screens = audit.screens.map((screen) => {
    const def = MARKETPLACE_SCREENS.find((s) => s.id === screen.screenId);
    const crudResults = def ? detectCrudForFiles(def.sourceFiles) : [];
    const crudDetected = crudResults.some((r) => r.fail) || screen.crudDetected;

    const marketplaceScoreBefore = computeMarketplaceScore(screen.scoresBefore);
    const marketplaceScoreAfter = screen.scoresAfter ? computeMarketplaceScore(screen.scoresAfter) : null;
    const marketplaceFeelingBefore = computeMarketplaceFeeling(screen.scoresBefore);
    const marketplaceFeelingAfter = screen.scoresAfter ? computeMarketplaceFeeling(screen.scoresAfter) : null;

    return {
      ...screen,
      crudDetected,
      marketplaceScoreBefore,
      marketplaceScoreAfter,
      marketplaceFeelingBefore,
      marketplaceFeelingAfter,
    };
  });

  const p0 = screens.flatMap((s) => s.issues).filter((i) => i.priority === "P0").length;
  const p1 = screens.flatMap((s) => s.issues).filter((i) => i.priority === "P1").length;
  const p2 = screens.flatMap((s) => s.issues).filter((i) => i.priority === "P2").length;
  const screensAudited = screens.filter((s) => s.marketplaceScoreBefore !== null).length;

  const indexBefore = indexFromScreens(screens, "before");
  const indexAfter = indexFromScreens(screens, "after");

  const feelingBefore =
    screens.filter((s) => s.marketplaceFeelingBefore !== null).map((s) => s.marketplaceFeelingBefore!) ;
  const feelingAfter = screens.filter((s) => s.marketplaceFeelingAfter !== null).map((s) => s.marketplaceFeelingAfter!);
  const avgBefore = feelingBefore.length ? feelingBefore.reduce((a, b) => a + b, 0) / feelingBefore.length : null;
  const avgAfter = feelingAfter.length ? feelingAfter.reduce((a, b) => a + b, 0) / feelingAfter.length : null;

  return {
    ...audit,
    screens,
    summary: {
      p0,
      p1,
      p2,
      screensAudited,
      screensTotal: screens.length,
      marketplaceQualityIndexBefore: indexBefore,
      marketplaceQualityIndexAfter: indexAfter,
      marketplaceFeelingDelta:
        avgBefore !== null && avgAfter !== null ? Math.round((avgAfter - avgBefore) * 100) / 100 : null,
    },
  };
}

export type MarketplaceQualityReport = {
  epic: "EPIC-84";
  wave: 0;
  generatedAt: string;
  designSystemVersion: string;
  marketplaceQualityIndex: number | null;
  marketplaceQualityIndexPrevious: number | null;
  indexDelta: number | null;
  marketplaceFeelingDelta: number | null;
  auditStatus: MarketplaceQualityAuditFile["auditStatus"];
  crudFailures: Array<{ screenId: string; name: string; files: string[] }>;
  p0: number;
  p1: number;
  p2: number;
  screens: MarketplaceScreenAudit[];
  componentCoverage?: { total: number; ready: number; needsRedesign: number; missing: number; coveragePercent: number };
};

export function buildMarketplaceQualityReport(
  audit: MarketplaceQualityAuditFile,
  previousIndex: number | null = null,
): MarketplaceQualityReport {
  const enriched = enrichAuditFile(audit);
  const index = enriched.summary.marketplaceQualityIndexAfter ?? enriched.summary.marketplaceQualityIndexBefore;

  const crudFailures = enriched.screens
    .filter((s) => s.crudDetected)
    .map((s) => ({
      screenId: s.screenId,
      name: s.name,
      files: MARKETPLACE_SCREENS.find((d) => d.id === s.screenId)?.sourceFiles ?? [],
    }));

  return {
    epic: "EPIC-84",
    wave: 0,
    generatedAt: new Date().toISOString(),
    designSystemVersion: enriched.designSystemVersion,
    marketplaceQualityIndex: index,
    marketplaceQualityIndexPrevious: previousIndex,
    indexDelta: index !== null && previousIndex !== null ? Math.round((index - previousIndex) * 100) / 100 : null,
    marketplaceFeelingDelta: enriched.summary.marketplaceFeelingDelta,
    auditStatus: enriched.auditStatus,
    crudFailures,
    p0: enriched.summary.p0,
    p1: enriched.summary.p1,
    p2: enriched.summary.p2,
    screens: enriched.screens,
  };
}
