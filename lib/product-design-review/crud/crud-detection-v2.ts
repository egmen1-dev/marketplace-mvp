import { readFileSync } from "node:fs";
import { join } from "node:path";

import { createIssue } from "../review/fix-loop";
import type { DesignReviewIssue } from "../types";

export type CrudV2Signal = {
  id: string;
  severity: "P0" | "P1" | "P2";
  title: string;
  excerpt: string;
  line?: number;
  recommendation: string;
};

const CRUD_V2_PATTERNS: Array<{
  id: string;
  regex: RegExp;
  severity: "P0" | "P1" | "P2";
  title: string;
  recommendation: string;
}> = [
  {
    id: "admin_table",
    regex: /\b(DataTable|FlatList.*columns|admin panel|crud table|TableHeader)\b/i,
    severity: "P0",
    title: "Admin table / CRUD grid pattern detected",
    recommendation: "Replace with action cards and revenue-first mobile patterns.",
  },
  {
    id: "database_dump",
    regex: /\b(JSON\.stringify\(.*\)|raw response|debug payload|__typename)\b/i,
    severity: "P0",
    title: "Raw API / database dump exposed in UI",
    recommendation: "Map API fields to human business language; hide technical payload.",
  },
  {
    id: "debug_panel",
    regex: /\b(DiagnosticsScreen|debug panel|BuildInfoPanel|console\.log\()/i,
    severity: "P1",
    title: "Debug panel pattern in product surface",
    recommendation: "Keep diagnostics behind profile/support entry, not primary flows.",
  },
  {
    id: "technical_dashboard",
    regex: /\b(DashboardScreen|AdminScreen|OperatorConsole)\b/,
    severity: "P0",
    title: "Technical dashboard screen naming",
    recommendation: "Use buyer/seller experience naming aligned with user goals.",
  },
  {
    id: "generic_no_data",
    regex: /["'`]Нет данных["'`]|["'`]No data["'`]/i,
    severity: "P0",
    title: "Generic empty copy without business context",
    recommendation: "Use screen-specific empty state with next action (not CRUD placeholder).",
  },
  {
    id: "internal_role_status",
    regex: /\b(sellerCapable|role=|internal_status|USER_ROLE|isAdmin)\b/,
    severity: "P1",
    title: "Internal role/status name visible in UI layer",
    recommendation: "Translate internal enums to user-facing business statuses.",
  },
  {
    id: "alert_dialog",
    regex: /\bAlert\.alert\s*\(/,
    severity: "P0",
    title: "System alert dialog in mobile UI",
    recommendation: "Use design-system modal/error components.",
  },
];

export function detectCrudV2InSource(relativePath: string, screen: string, root = process.cwd()): DesignReviewIssue[] {
  const filePath = join(root, relativePath);
  let content: string;
  try {
    content = readFileSync(filePath, "utf8");
  } catch {
    return [];
  }

  const lines = content.split("\n");
  const issues: DesignReviewIssue[] = [];

  for (const pattern of CRUD_V2_PATTERNS) {
    lines.forEach((line, index) => {
      if (!pattern.regex.test(line)) return;
      if (line.includes("// crud-v2:ignore")) return;
      issues.push(
        createIssue({
          screen,
          category: "consistency",
          severity: pattern.severity,
          title: pattern.title,
          component: relativePath,
          evidence: [`${relativePath}:${index + 1} matched ${pattern.id}: ${line.trim().slice(0, 100)}`],
          recommendation: pattern.recommendation,
          source: "static",
        }),
      );
      pattern.regex.lastIndex = 0;
    });
  }

  return issues;
}

export function detectCrudV2ForScreen(screen: string, sourceFiles: string[], root = process.cwd()): DesignReviewIssue[] {
  return sourceFiles.flatMap((file) => detectCrudV2InSource(file, screen, root));
}

export function screenHasCriticalCrud(issues: DesignReviewIssue[]): boolean {
  return issues.some((i) => i.severity === "P0" && /crud|admin table|raw api|generic empty|technical dashboard/i.test(i.title));
}
