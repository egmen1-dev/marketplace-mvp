import { prisma } from "@/lib/prisma";

/** Canonical migration that introduced EPIC 174 moderation schema. */
export const EPIC_174_MIGRATION_ID = "20260825100000_epic_174_moderation_engine";

type ColumnProbe = { table: string; column: string };
type TableProbe = { table: string };

const REQUIRED_COLUMNS: ColumnProbe[] = [
  { table: "products", column: "contentVersion" },
  { table: "products", column: "publishedAt" },
  { table: "product_moderations", column: "riskScore" },
  { table: "product_moderations", column: "policyVersion" },
  { table: "product_moderations", column: "reviewMode" },
  { table: "product_moderations", column: "stage" },
  { table: "product_moderations", column: "reasonCodes" },
  { table: "product_moderations", column: "systemRecommendation" },
  { table: "product_moderations", column: "contentVersionHash" },
  { table: "product_moderations", column: "decisionVersion" },
  { table: "product_moderations", column: "submittedAt" },
];

const REQUIRED_TABLES: TableProbe[] = [{ table: "product_moderation_audit_events" }];

export type SchemaCompatibilityResult = {
  compatible: boolean;
  reachable: boolean;
  missingColumns: string[];
  missingTables: string[];
  epic174MigrationApplied: boolean | null;
  detail: string;
};

async function columnExists(table: string, column: string): Promise<boolean> {
  const rows = await prisma.$queryRaw<{ exists: boolean }[]>`
    SELECT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = ${table}
        AND column_name = ${column}
    ) AS "exists"
  `;
  return Boolean(rows[0]?.exists);
}

async function tableExists(table: string): Promise<boolean> {
  const rows = await prisma.$queryRaw<{ exists: boolean }[]>`
    SELECT EXISTS (
      SELECT 1
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name = ${table}
    ) AS "exists"
  `;
  return Boolean(rows[0]?.exists);
}

async function migrationApplied(migrationId: string): Promise<boolean | null> {
  try {
    const rows = await prisma.$queryRaw<{ exists: boolean }[]>`
      SELECT EXISTS (
        SELECT 1
        FROM "_prisma_migrations"
        WHERE migration_name = ${migrationId}
          AND finished_at IS NOT NULL
          AND rolled_back_at IS NULL
      ) AS "exists"
    `;
    return Boolean(rows[0]?.exists);
  } catch {
    return null;
  }
}

export async function checkSchemaCompatibility(): Promise<SchemaCompatibilityResult> {
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    return {
      compatible: false,
      reachable: false,
      missingColumns: REQUIRED_COLUMNS.map((c) => `${c.table}.${c.column}`),
      missingTables: REQUIRED_TABLES.map((t) => t.table),
      epic174MigrationApplied: null,
      detail: "database_unreachable",
    };
  }

  const missingColumns: string[] = [];
  for (const probe of REQUIRED_COLUMNS) {
    const exists = await columnExists(probe.table, probe.column);
    if (!exists) missingColumns.push(`${probe.table}.${probe.column}`);
  }

  const missingTables: string[] = [];
  for (const probe of REQUIRED_TABLES) {
    const exists = await tableExists(probe.table);
    if (!exists) missingTables.push(probe.table);
  }

  const epic174MigrationApplied = await migrationApplied(EPIC_174_MIGRATION_ID);
  const compatible = missingColumns.length === 0 && missingTables.length === 0;

  return {
    compatible,
    reachable: true,
    missingColumns,
    missingTables,
    epic174MigrationApplied,
    detail: compatible ? "compatible" : "schema_incompatible",
  };
}
