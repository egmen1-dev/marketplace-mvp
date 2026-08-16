import { readFileSync } from "node:fs";
import { join } from "node:path";

export type CrudSignal = {
  pattern: string;
  line?: number;
  excerpt?: string;
};

export type CrudDetectionResult = {
  file: string;
  fail: boolean;
  signals: CrudSignal[];
};

const CRUD_PATTERNS: Array<{ id: string; regex: RegExp; weight: number }> = [
  { id: "alert_dialog", regex: /\bAlert\.alert\s*\(/, weight: 2 },
  { id: "no_data_ru", regex: /["'`]Нет данных["'`]/, weight: 3 },
  { id: "no_data_en", regex: /["'`]No data["'`]/i, weight: 3 },
  { id: "admin_ui", regex: /\b(admin panel|admin dashboard|crud table)\b/i, weight: 2 },
  { id: "bootstrap_demo", regex: /\b(bootstrap demo|material demo|hello world screen)\b/i, weight: 2 },
  { id: "bare_dashboard", regex: /\bDashboardScreen\b|\bAdminScreen\b/, weight: 1 },
  { id: "todo_ui", regex: /\bTODO:\s*ui\b/i, weight: 1 },
];

/** Raw fontSize outside typography spread — heuristic CRUD/MVP signal */
const RAW_FONT_SIZE = /fontSize:\s*(\d+)/g;

const ALLOWED_FONT_SIZES = new Set([11, 13, 14, 15, 16, 18, 20, 22, 24, 28, 40]);

export function detectCrudInSource(relativePath: string, root = process.cwd()): CrudDetectionResult {
  const file = join(root, relativePath);
  let content: string;
  try {
    content = readFileSync(file, "utf8");
  } catch {
    return { file: relativePath, fail: false, signals: [] };
  }

  const signals: CrudSignal[] = [];
  const lines = content.split("\n");

  for (const { id, regex } of CRUD_PATTERNS) {
    lines.forEach((line, index) => {
      if (regex.test(line)) {
        signals.push({ pattern: id, line: index + 1, excerpt: line.trim().slice(0, 120) });
      }
      regex.lastIndex = 0;
    });
  }

  if (relativePath.startsWith("apps/mobile/app/") || relativePath.includes("/components/ui/")) {
    lines.forEach((line, index) => {
      if (line.includes("typography.") || line.includes("...typography")) return;
      let match: RegExpExecArray | null;
      RAW_FONT_SIZE.lastIndex = 0;
      while ((match = RAW_FONT_SIZE.exec(line)) !== null) {
        const size = Number(match[1]);
        if (!ALLOWED_FONT_SIZES.has(size)) {
          signals.push({
            pattern: "non_standard_font_size",
            line: index + 1,
            excerpt: line.trim().slice(0, 120),
          });
        }
      }
    });
  }

  const fail =
    signals.some((s) => s.pattern === "no_data_ru" || s.pattern === "no_data_en" || s.pattern === "alert_dialog") ||
    signals.filter((s) => s.pattern === "non_standard_font_size").length >= 3;

  return { file: relativePath, fail, signals };
}

export function detectCrudForFiles(relativePaths: string[]): CrudDetectionResult[] {
  return relativePaths.map((p) => detectCrudInSource(p));
}

export function screenFailsCrudCheck(sourceFiles: string[]): boolean {
  return detectCrudForFiles(sourceFiles).some((r) => r.fail);
}
