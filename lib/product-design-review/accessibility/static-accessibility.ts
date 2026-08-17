import { readFileSync } from "node:fs";
import { join } from "node:path";

import { createIssue } from "../review/fix-loop";
import type { DesignReviewIssue } from "../types";

export function reviewAccessibility(screen: string, sourceFiles: string[], root = process.cwd()): DesignReviewIssue[] {
  const issues: DesignReviewIssue[] = [];

  for (const file of sourceFiles) {
    let content: string;
    try {
      content = readFileSync(join(root, file), "utf8");
    } catch {
      continue;
    }

    const pressables = (content.match(/<Pressable|<TouchableOpacity|<Button/g) ?? []).length;
    const labels = (content.match(/accessibilityLabel=/g) ?? []).length;
    const iconOnly = (content.match(/icon=\{|IconButton|accessibilityLabel=\{?\s*['"]\s*['"]/g) ?? []).length;

    if (pressables > 0 && labels === 0 && pressables >= 3) {
      issues.push(
        createIssue({
          screen,
          category: "accessibility",
          severity: "P1",
          title: "Interactive elements missing accessibilityLabel",
          component: file,
          evidence: [`${file}: ${pressables} interactive elements, ${labels} accessibilityLabel`],
          recommendation: "Add accessibilityLabel to icon-only and primary actions.",
          source: "static",
        }),
      );
    }

    if (iconOnly > 0 && labels < iconOnly) {
      issues.push(
        createIssue({
          screen,
          category: "accessibility",
          severity: "P0",
          title: "Icon-only buttons without accessible labels",
          component: file,
          evidence: [`${file}: icon-only controls ${iconOnly}, labels ${labels}`],
          recommendation: "Every icon-only control needs accessibilityLabel and min 44dp target.",
          source: "static",
        }),
      );
    }

    if (/color:\s*['"]#(?:ccc|ddd|eee|f5f5f5)/i.test(content)) {
      issues.push(
        createIssue({
          screen,
          category: "accessibility",
          severity: "P1",
          title: "Potential low-contrast text color",
          component: file,
          evidence: [`${file}: light gray text color heuristic`],
          recommendation: "Use text.secondary/muted tokens; verify contrast ≥ 4.5:1.",
          source: "static",
        }),
      );
    }
  }

  return issues;
}
