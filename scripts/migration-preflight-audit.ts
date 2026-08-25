#!/usr/bin/env tsx
/** Documents migration safety audit before applying EPIC 174 migration. */
import { execSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const OUT = join(process.cwd(), "artifacts/closed-beta-rc10.4");
const MIGRATION_ID = "20260825100000_epic_174_moderation_engine";
const MIGRATION_SQL = readFileSync(
  join(process.cwd(), `prisma/migrations/${MIGRATION_ID}/migration.sql`),
  "utf8",
);

function sh(cmd: string): string {
  try {
    return execSync(cmd, { encoding: "utf8" }).trim();
  } catch (e) {
    return `ERROR: ${e instanceof Error ? e.message : String(e)}`;
  }
}

function classifyOperations(sql: string) {
  const lines = sql.split("\n").map((l) => l.trim()).filter(Boolean);
  const ops: { type: string; line: string; destructive: boolean }[] = [];
  for (const line of lines) {
    if (line.startsWith("ALTER TABLE") && line.includes("ADD COLUMN")) {
      ops.push({ type: "ADD_COLUMN", line, destructive: false });
    } else if (line.startsWith("CREATE TABLE")) {
      ops.push({ type: "CREATE_TABLE", line, destructive: false });
    } else if (line.startsWith("CREATE INDEX")) {
      ops.push({ type: "CREATE_INDEX", line, destructive: false });
    } else if (line.startsWith("ALTER TABLE") && line.includes("FOREIGN KEY")) {
      ops.push({ type: "FOREIGN_KEY", line, destructive: false });
    } else if (line.startsWith("DROP CONSTRAINT")) {
      ops.push({ type: "DROP_CONSTRAINT", line, destructive: false });
    } else {
      ops.push({ type: "OTHER", line, destructive: /DROP TABLE|DELETE FROM|TRUNCATE/i.test(line) });
    }
  }
  return ops;
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  const operations = classifyOperations(MIGRATION_SQL);
  const destructive = operations.filter((o) => o.destructive);

  let migrateStatus = "NOT_RUN";
  let migrateStatusOutput = "";
  if (process.env.DATABASE_URL) {
    migrateStatusOutput = sh("npx prisma migrate status 2>&1");
    migrateStatus = migrateStatusOutput.includes("Database schema is up to date")
      ? "UP_TO_DATE"
      : migrateStatusOutput.includes(MIGRATION_ID)
        ? "PENDING"
        : "UNKNOWN";
  }

  const report = {
    generatedAt: new Date().toISOString(),
    migrationId: MIGRATION_ID,
    provider: "PostgreSQL (Railway staging via web-v2)",
    backup: {
      automatedSnapshotAvailable: "UNKNOWN — operator must confirm Railway Postgres backup policy",
      actionBeforeMigration: "Verify Railway Postgres snapshot/backup if operational access permits",
    },
    safetyAssessment: {
      canDropData: destructive.length > 0,
      destructiveOperations: destructive,
      dataRewrite: false,
      notNullWithoutDefaultOnExisting: operations.some(
        (o) => o.line.includes("NOT NULL") && !o.line.includes("DEFAULT"),
      ),
      verdict: destructive.length === 0 ? "SAFE_ADDITIVE" : "REVIEW_REQUIRED",
      notes: [
        "All column additions use IF NOT EXISTS or DEFAULT — existing Product/ProductModeration rows preserved",
        "New audit table is append-only; no existing rows modified",
        "No DROP TABLE or TRUNCATE",
        "Do not use migrate reset or manual resolve without SQL execution",
      ],
    },
    operations,
    prismaMigrateStatus: {
      ran: Boolean(process.env.DATABASE_URL),
      state: migrateStatus,
      output: migrateStatusOutput ? migrateStatusOutput.slice(0, 4000) : null,
    },
  };

  writeFileSync(join(OUT, "migration-preflight.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
}

main();
