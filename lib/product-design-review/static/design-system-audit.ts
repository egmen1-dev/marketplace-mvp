import { readFileSync } from "node:fs";
import { join } from "node:path";
import ts from "typescript";

import { createIssue } from "../review/fix-loop";
import type { DesignReviewIssue } from "../types";

const HEX_LITERAL = /#[0-9A-Fa-f]{3,8}\b/;
const ENGLISH_STATUS = /\b(Pending|Processing|Completed|Failed|Success|Loading)\b/;
const SYSTEM_ALERT = /\bAlert\.alert\s*\(/;
const RAW_ACTIVITY = /\bActivityIndicator\b/;
const MANUAL_FONT = /fontSize:\s*(\d+)/;
const MANUAL_MARGIN = /margin(?:Top|Bottom|Left|Right|Horizontal|Vertical)?:\s*(\d+)/;
const MANUAL_PADDING = /padding(?:Top|Bottom|Left|Right|Horizontal|Vertical)?:\s*(\d+)/;
const MANUAL_RADIUS = /borderRadius:\s*(\d+)/;
const SMALL_TOUCH = /(?:width|height|minHeight|minWidth):\s*(3[0-9]|[12]?\d)\b/;

const ALLOWED_SPACING = new Set([0, 4, 8, 12, 16, 20, 24, 32, 40, 48, 52, 56, 64]);
const ALLOWED_RADII = new Set([8, 12, 16, 20, 999]);
const ALLOWED_FONT_SIZES = new Set([11, 13, 14, 15, 16, 18, 20, 22, 24, 28, 40]);

export type StaticAuditOptions = {
  root?: string;
  relativePath: string;
  screen: string;
};

export function auditDesignSystemSource(options: StaticAuditOptions): DesignReviewIssue[] {
  const root = options.root ?? process.cwd();
  const filePath = join(root, options.relativePath);
  let content: string;
  try {
    content = readFileSync(filePath, "utf8");
  } catch {
    return [];
  }

  const issues: DesignReviewIssue[] = [];
  const lines = content.split("\n");
  const usesDesignTokens =
    content.includes("design-system/tokens") ||
    content.includes("typography.") ||
    content.includes("radii.") ||
    content.includes("layout.");

  lines.forEach((line, index) => {
    const lineNo = index + 1;
    if (line.includes("// design-review:ignore")) return;

    if (HEX_LITERAL.test(line) && !line.includes("design-system") && !line.includes("sellerBrand")) {
      issues.push(
        createIssue({
          screen: options.screen,
          category: "consistency",
          severity: "P1",
          title: "Random HEX color outside design tokens",
          component: options.relativePath,
          evidence: [`${options.relativePath}:${lineNo} ${line.trim().slice(0, 100)}`],
          recommendation: "Replace with semantic token from design-system/tokens or seller tokens.",
          source: "static",
        }),
      );
    }

    if (SYSTEM_ALERT.test(line)) {
      issues.push(
        createIssue({
          screen: options.screen,
          category: "trust",
          severity: "P0",
          title: "System Alert used in production UI",
          component: options.relativePath,
          evidence: [`${options.relativePath}:${lineNo} Alert.alert detected`],
          recommendation: "Use in-app modal / SectionErrorCard from design system.",
          source: "static",
        }),
      );
    }

    if (RAW_ACTIVITY.test(line) && !line.includes("Startup") && !line.includes("feedback.tsx")) {
      issues.push(
        createIssue({
          screen: options.screen,
          category: "loading",
          severity: "P2",
          title: "Raw ActivityIndicator outside approved loading pattern",
          component: options.relativePath,
          evidence: [`${options.relativePath}:${lineNo} ActivityIndicator`],
          recommendation: "Use ShimmerBlock / screen skeleton from design system.",
          source: "static",
        }),
      );
    }

    if (ENGLISH_STATUS.test(line) && options.relativePath.startsWith("apps/mobile/")) {
      issues.push(
        createIssue({
          screen: options.screen,
          category: "consistency",
          severity: "P2",
          title: "English status string in RU UI surface",
          component: options.relativePath,
          evidence: [`${options.relativePath}:${lineNo} ${line.trim().slice(0, 80)}`],
          recommendation: "Localize user-visible status copy to Russian.",
          source: "static",
        }),
      );
    }

    const fontMatch = line.match(MANUAL_FONT);
    if (fontMatch && !line.includes("typography.") && !line.includes("...typography")) {
      const size = Number(fontMatch[1]);
      if (!ALLOWED_FONT_SIZES.has(size)) {
        issues.push(
          createIssue({
            screen: options.screen,
            category: "consistency",
            severity: "P2",
            title: "Manual fontSize outside typography scale",
            component: options.relativePath,
            evidence: [`${options.relativePath}:${lineNo} fontSize:${size}`],
            recommendation: "Use typography.* spread from design-system/tokens.",
            source: "static",
          }),
        );
      }
    }

    for (const [regex, label, allowed] of [
      [MANUAL_MARGIN, "margin", ALLOWED_SPACING] as const,
      [MANUAL_PADDING, "padding", ALLOWED_SPACING] as const,
      [MANUAL_RADIUS, "borderRadius", ALLOWED_RADII] as const,
    ]) {
      const match = line.match(regex);
      if (!match) continue;
      if (line.includes("layout.") || line.includes("radii.") || line.includes("SPACING")) continue;
      const value = Number(match[1]);
      if (!allowed.has(value)) {
        issues.push(
          createIssue({
            screen: options.screen,
            category: "consistency",
            severity: "P2",
            title: `Arbitrary ${label} value outside approved scale`,
            component: options.relativePath,
            evidence: [`${options.relativePath}:${lineNo} ${label}:${value}`],
            recommendation: "Use layout/spacing/radii tokens from design system.",
            source: "static",
          }),
        );
      }
    }

    const touchMatch = line.match(SMALL_TOUCH);
    if (touchMatch) {
      const size = Number(touchMatch[1]);
      if (size > 0 && size < 44 && /Pressable|Touchable|Button/.test(content)) {
        issues.push(
          createIssue({
            screen: options.screen,
            category: "accessibility",
            severity: "P1",
            title: "Potential touch target below 44dp",
            component: options.relativePath,
            evidence: [`${options.relativePath}:${lineNo} dimension ${size} < 44dp heuristic`],
            recommendation: "Ensure interactive target min 44×44dp via layout tokens.",
            source: "static",
          }),
        );
      }
    }
  });

  if (!usesDesignTokens && options.relativePath.startsWith("apps/mobile/app/")) {
    issues.push(
      createIssue({
        screen: options.screen,
        category: "consistency",
        severity: "P1",
        title: "Screen source missing design-system token imports",
        component: options.relativePath,
        evidence: [`${options.relativePath} has no design-system/tokens usage detected`],
        recommendation: "Route styling through design-system tokens, not ad-hoc StyleSheet values.",
        source: "static",
      }),
    );
  }

  const astIssues = auditWithTypescriptAst(content, options.relativePath, options.screen);
  return dedupeIssues([...issues, ...astIssues]);
}

function auditWithTypescriptAst(content: string, relativePath: string, screen: string): DesignReviewIssue[] {
  const source = ts.createSourceFile(relativePath, content, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const issues: DesignReviewIssue[] = [];

  const visit = (node: ts.Node) => {
    if (ts.isCallExpression(node)) {
      const text = node.expression.getText(source);
      if (text.endsWith("StyleSheet.create")) {
        const arg = node.arguments[0];
        if (arg && ts.isObjectLiteralExpression(arg)) {
          for (const prop of arg.properties) {
            if (!ts.isPropertyAssignment(prop)) continue;
            const init = prop.initializer;
            if (ts.isObjectLiteralExpression(init)) {
              const styleText = init.getText(source);
              if (/shadowColor:\s*['"]#/.test(styleText) && !styleText.includes("shadows.")) {
                issues.push(
                  createIssue({
                    screen,
                    category: "consistency",
                    severity: "P2",
                    title: "Inconsistent hardcoded shadow in StyleSheet",
                    component: relativePath,
                    evidence: [`${relativePath} StyleSheet shadowColor hardcoded`],
                    recommendation: "Use shadows.* tokens from design-system.",
                    source: "static",
                  }),
                );
              }
            }
          }
        }
      }
    }
    ts.forEachChild(node, visit);
  };

  visit(source);
  return issues;
}

function dedupeIssues(issues: DesignReviewIssue[]): DesignReviewIssue[] {
  const seen = new Set<string>();
  return issues.filter((issue) => {
    if (seen.has(issue.id)) return false;
    seen.add(issue.id);
    return true;
  });
}

export function auditScreenSources(screen: string, sourceFiles: string[], root = process.cwd()): DesignReviewIssue[] {
  return sourceFiles.flatMap((relativePath) => auditDesignSystemSource({ root, relativePath, screen }));
}
