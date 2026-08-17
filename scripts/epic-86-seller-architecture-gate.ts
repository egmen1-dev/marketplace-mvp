#!/usr/bin/env tsx
/** EPIC-86 — Seller Experience Platform architecture gate (no screen implementation) */
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

type Row = { id: string; ok: boolean; detail?: string };

const REQUIRED_SCREENS = [
  "splash",
  "login",
  "seller_home",
  "seller_products",
  "seller_product_detail",
  "seller_orders",
  "seller_finance",
  "seller_analytics",
  "seller_promotion",
  "seller_ai_assistant",
  "profile",
] as const;

const REQUIRED_HOME_BLOCKS = [
  "today",
  "sales",
  "attention",
  "recent_orders",
  "top_products",
  "money",
  "growth",
  "ai",
  "promotion",
  "history",
] as const;

const REQUIRED_COMPONENT_CATEGORIES = [
  "cards",
  "metrics",
  "charts",
  "orders",
  "finance",
  "products",
  "promotion",
  "ai",
  "status",
  "banners",
  "insights",
  "layout",
  "feedback",
] as const;

const REQUIRED_SELLER_FILES = [
  "apps/mobile/src/design-system/seller/index.ts",
  "apps/mobile/src/design-system/seller/tokens/colors.ts",
  "apps/mobile/src/design-system/seller/tokens/typography.ts",
  "apps/mobile/src/design-system/seller/tokens/index.ts",
  "apps/mobile/src/design-system/seller/standards/seller-design-standard.ts",
  "apps/mobile/src/design-system/seller/components/registry.ts",
  "apps/mobile/src/design-system/seller/blueprints/types.ts",
  "apps/mobile/src/design-system/seller/blueprints/index.ts",
  "apps/mobile/src/design-system/seller/blueprints/seller-home.blueprint.ts",
  "apps/mobile/src/design-system/seller/blueprints/seller-screens.blueprint.ts",
  "apps/mobile/src/design-system/seller/journey/seller-user-journey.ts",
  "apps/mobile/src/design-system/seller/navigation/seller-navigation.ts",
  "apps/mobile/src/design-system/seller/benchmark/seller-benchmark.ts",
  "apps/mobile/src/design-system/seller/audit/seller-marketplace-audit.ts",
  "apps/mobile/src/design-system/seller/roadmap/seller-sprints.ts",
  "docs/product/EPIC_86_SELLER_EXPERIENCE_PLATFORM.md",
] as const;

const BLUEPRINT_FIELDS = [
  "purpose",
  "primaryCTA",
  "secondaryCTA",
  "informationHierarchy",
  "conversionGoal",
  "popTelemetry",
  "offlineBehaviour",
  "loading",
  "error",
  "emptyState",
] as const;

async function loadSellerModules() {
  const root = process.cwd();
  const [
    blueprints,
    journey,
    registry,
    navigation,
    roadmap,
    benchmark,
    audit,
    standards,
    homeBlueprint,
  ] = await Promise.all([
    import(join(root, "apps/mobile/src/design-system/seller/blueprints/index.ts")),
    import(join(root, "apps/mobile/src/design-system/seller/journey/seller-user-journey.ts")),
    import(join(root, "apps/mobile/src/design-system/seller/components/registry.ts")),
    import(join(root, "apps/mobile/src/design-system/seller/navigation/seller-navigation.ts")),
    import(join(root, "apps/mobile/src/design-system/seller/roadmap/seller-sprints.ts")),
    import(join(root, "apps/mobile/src/design-system/seller/benchmark/seller-benchmark.ts")),
    import(join(root, "apps/mobile/src/design-system/seller/audit/seller-marketplace-audit.ts")),
    import(join(root, "apps/mobile/src/design-system/seller/standards/seller-design-standard.ts")),
    import(join(root, "apps/mobile/src/design-system/seller/blueprints/seller-home.blueprint.ts")),
  ]);

  return {
    blueprints,
    journey,
    registry,
    navigation,
    roadmap,
    benchmark,
    audit,
    standards,
    homeBlueprint,
  };
}

async function main() {
  const rows: Row[] = [];
  const root = process.cwd();

  for (const file of REQUIRED_SELLER_FILES) {
    rows.push({ id: `file_${file.split("/").pop()}`, ok: existsSync(join(root, file)), detail: file });
  }

  const packageJson = JSON.parse(readFileSync(join(root, "package.json"), "utf8")) as {
    scripts?: Record<string, string>;
  };
  rows.push({
    id: "package_script",
    ok: packageJson.scripts?.["product:epic-86:architecture"] === "tsx scripts/epic-86-seller-architecture-gate.ts",
  });

  const componentsDir = join(root, "apps/mobile/src/design-system/seller/components");
  const componentFiles = existsSync(componentsDir)
    ? readdirSync(componentsDir).filter((name) => name.endsWith(".tsx"))
    : [];
  rows.push({
    id: "no_seller_component_implementations",
    ok: componentFiles.length === 0,
    detail: componentFiles.length > 0 ? componentFiles.join(", ") : "architecture only",
  });

  const {
    blueprints,
    journey,
    registry,
    navigation,
    roadmap,
    benchmark,
    audit,
    standards,
    homeBlueprint,
  } = await loadSellerModules();

  const screenIds = blueprints.SELLER_SCREEN_IDS;
  rows.push({
    id: "screen_inventory_complete",
    ok: REQUIRED_SCREENS.every((id) => screenIds.includes(id)) && screenIds.length === REQUIRED_SCREENS.length,
    detail: `${screenIds.length}/${REQUIRED_SCREENS.length}`,
  });

  const journeyScreenIds = journey.SELLER_USER_JOURNEY.map((step) => step.screenId);
  rows.push({
    id: "user_journey_complete",
    ok:
      journey.SELLER_USER_JOURNEY.length === REQUIRED_SCREENS.length &&
      REQUIRED_SCREENS.every((id) => journeyScreenIds.includes(id)),
    detail: `${journey.SELLER_USER_JOURNEY.length} steps`,
  });

  rows.push({
    id: "journey_philosophy",
    ok: journey.SELLER_JOURNEY_PHILOSOPHY.includes("заработал") && journey.SELLER_JOURNEY_PHILOSOPHY.includes("сегодня"),
  });

  const blueprintByScreen = new Map(blueprints.SELLER_BLUEPRINTS.map((bp) => [bp.screenId, bp]));
  const missingBlueprints = REQUIRED_SCREENS.filter((id) => !blueprintByScreen.has(id));
  rows.push({
    id: "blueprint_coverage",
    ok: missingBlueprints.length === 0,
    detail: missingBlueprints.length > 0 ? missingBlueprints.join(", ") : "all screens",
  });

  const incompleteBlueprints = REQUIRED_SCREENS.filter((id) => {
    const bp = blueprintByScreen.get(id);
    if (!bp) return true;
    return BLUEPRINT_FIELDS.some((field) => {
      const value = bp[field];
      if (Array.isArray(value)) return value.length === 0;
      return typeof value !== "string" || value.trim().length === 0;
    });
  });
  rows.push({
    id: "blueprint_fields_complete",
    ok: incompleteBlueprints.length === 0,
    detail: incompleteBlueprints.length > 0 ? incompleteBlueprints.join(", ") : "all fields",
  });

  const homeBlocks = homeBlueprint.SELLER_HOME_BLUEPRINT.blocks ?? [];
  const homeBlockIds = homeBlocks.map((block) => block.id);
  rows.push({
    id: "seller_home_blueprint_blocks",
    ok:
      homeBlocks.length === REQUIRED_HOME_BLOCKS.length &&
      REQUIRED_HOME_BLOCKS.every((id) => homeBlockIds.includes(id)),
    detail: `${homeBlocks.length}/${REQUIRED_HOME_BLOCKS.length}`,
  });

  const homeBlockFieldsOk = homeBlocks.every(
    (block) =>
      block.goal.trim().length > 0 &&
      block.showWhen.trim().length > 0 &&
      block.hideWhen.trim().length > 0 &&
      block.apiSource.trim().length > 0 &&
      block.onPress.trim().length > 0,
  );
  rows.push({ id: "seller_home_block_fields", ok: homeBlockFieldsOk });

  const categories = new Set(registry.SELLER_DESIGN_SYSTEM_COMPONENTS.map((c) => c.category));
  const missingCategories = REQUIRED_COMPONENT_CATEGORIES.filter((cat) => !categories.has(cat));
  rows.push({
    id: "component_registry_categories",
    ok: missingCategories.length === 0 && registry.SELLER_DESIGN_SYSTEM_COMPONENTS.length >= 30,
    detail: `${registry.SELLER_DESIGN_SYSTEM_COMPONENTS.length} components, ${categories.size} categories`,
  });

  const statuses = new Set(registry.SELLER_DESIGN_SYSTEM_COMPONENTS.map((c) => c.status));
  rows.push({
    id: "component_registry_statuses",
    ok: statuses.has("ready") || statuses.has("needs_redesign") || statuses.has("planned"),
    detail: [...statuses].join(", "),
  });

  rows.push({
    id: "roadmap_sprints",
    ok: roadmap.SELLER_SPRINT_ROADMAP.length === 8,
    detail: `${roadmap.SELLER_SPRINT_ROADMAP.length} sprints`,
  });

  rows.push({
    id: "roadmap_blocked_by_architecture",
    ok: roadmap.SELLER_SPRINT_ROADMAP[0]?.blockedBy.includes("EPIC 86 architecture"),
  });

  rows.push({
    id: "navigation_bottom_tabs",
    ok: navigation.SELLER_BOTTOM_TABS.length === 5,
    detail: navigation.SELLER_BOTTOM_TABS.map((tab) => tab.id).join(", "),
  });

  rows.push({
    id: "navigation_deep_links",
    ok: navigation.SELLER_DEEP_LINKS.length >= 8,
    detail: `${navigation.SELLER_DEEP_LINKS.length} deep links`,
  });

  rows.push({
    id: "navigation_push_destinations",
    ok: navigation.SELLER_PUSH_DESTINATIONS.length >= 5,
    detail: `${navigation.SELLER_PUSH_DESTINATIONS.length} push routes`,
  });

  rows.push({
    id: "benchmark_principles",
    ok: benchmark.SELLER_BENCHMARK_PRINCIPLES.length >= 6,
    detail: `${benchmark.SELLER_BENCHMARK_PRINCIPLES.length} principles`,
  });

  rows.push({
    id: "audit_projections",
    ok: audit.SELLER_SCREEN_AUDIT_PROJECTIONS.length === 8,
    detail: `${audit.SELLER_SCREEN_AUDIT_PROJECTIONS.length} screen projections`,
  });

  rows.push({
    id: "audit_metrics",
    ok: audit.SELLER_AUDIT_METRICS.length === 6,
    detail: audit.SELLER_AUDIT_METRICS.map((m) => m.id).join(", "),
  });

  rows.push({
    id: "design_standard_principles",
    ok: standards.SELLER_DESIGN_PRINCIPLES.length >= 6,
    detail: `${standards.SELLER_DESIGN_PRINCIPLES.length} principles`,
  });

  const doc = readFileSync(join(root, "docs/product/EPIC_86_SELLER_EXPERIENCE_PLATFORM.md"), "utf8");
  const docSections = [
    "философия",
    "User Journey",
    "Seller Home Blueprint",
    "Component Registry",
    "Roadmap",
    "Benchmark",
    "Marketplace Audit",
    "Navigation",
  ];
  for (const section of docSections) {
    rows.push({
      id: `doc_section_${section.replace(/\s+/g, "_").toLowerCase()}`,
      ok: doc.toLowerCase().includes(section.toLowerCase()),
    });
  }

  const failed = rows.filter((row) => !row.ok);
  const report = {
    epic: "EPIC-86",
    phase: "Seller Experience Platform · Architecture",
    generatedAt: new Date().toISOString(),
    verdict: failed.length === 0 ? "PASS" : "FAIL",
    architectureApproved: failed.length === 0,
    implementationBlockedUntil: failed.length === 0 ? "Sprint 1 may begin after human approval" : "Fix architecture gaps first",
    screenInventory: REQUIRED_SCREENS.length,
    blueprintCount: blueprints.SELLER_BLUEPRINTS.length,
    componentCount: registry.SELLER_DESIGN_SYSTEM_COMPONENTS.length,
    sprintCount: roadmap.SELLER_SPRINT_ROADMAP.length,
    rows,
  };

  const outDir = join(root, "artifacts/epic-86-seller-experience");
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, "gate-report.json"), JSON.stringify(report, null, 2));

  console.log(JSON.stringify(report, null, 2));
  if (failed.length > 0) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
