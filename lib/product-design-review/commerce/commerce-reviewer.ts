import { readFileSync } from "node:fs";
import { join } from "node:path";

import { createIssue } from "../review/fix-loop";
import type { DesignReviewIssue, VisualAttentionReport } from "../types";

const COMMERCE_CHECKS: Record<
  string,
  Array<{
    id: string;
    regex: RegExp;
    expect: boolean;
    severity: "P0" | "P1" | "P2";
    title: string;
    recommendation: string;
  }>
> = {
  catalog: [
    {
      id: "product_card",
      regex: /CatalogProductCard|product card|ProductCard/i,
      expect: true,
      severity: "P0",
      title: "Catalog missing product card component",
      recommendation: "Product image must dominate catalog grid cells.",
    },
    {
      id: "price_visible",
      regex: /price|₽|formatPrice/i,
      expect: true,
      severity: "P0",
      title: "Catalog missing readable price treatment",
      recommendation: "Ensure price typography is visible on each product card.",
    },
  ],
  pdp: [
    {
      id: "product_hero",
      regex: /ProductDetail|hero|gallery|ProductImage/i,
      expect: true,
      severity: "P0",
      title: "PDP missing product hero visibility",
      recommendation: "Product media must appear above fold before secondary actions.",
    },
    {
      id: "primary_cta",
      regex: /(addToCart|В корзину|Купить|checkout)/i,
      expect: true,
      severity: "P0",
      title: "PDP missing primary purchase CTA",
      recommendation: "Add dominant primary CTA with clear commerce copy.",
    },
    {
      id: "trust_block",
      regex: /(delivery|seller|trust|СДЭК|доставк)/i,
      expect: true,
      severity: "P1",
      title: "PDP missing trust/delivery context",
      recommendation: "Show delivery and seller trust cues near price/CTA.",
    },
  ],
  cart: [
    {
      id: "line_items",
      regex: /CartItem|line item|товар/i,
      expect: true,
      severity: "P0",
      title: "Cart missing purchasable line item presentation",
      recommendation: "Each cart row must show product, qty, price.",
    },
    {
      id: "checkout_cta",
      regex: /(checkout|Оформить|перейти к оформлению)/i,
      expect: true,
      severity: "P0",
      title: "Cart missing dominant checkout CTA",
      recommendation: "Checkout CTA should visually dominate cart footer.",
    },
    {
      id: "total_summary",
      regex: /(total|итого|sum|amount)/i,
      expect: true,
      severity: "P1",
      title: "Cart missing total summary clarity",
      recommendation: "Show order total before checkout action.",
    },
  ],
};

export function reviewCommerceScreen(screen: string, sourceFiles: string[], root = process.cwd()): DesignReviewIssue[] {
  const checks = COMMERCE_CHECKS[screen];
  if (!checks) return [];

  const combined = sourceFiles
    .map((file) => {
      try {
        return readFileSync(join(root, file), "utf8");
      } catch {
        return "";
      }
    })
    .join("\n");

  const issues: DesignReviewIssue[] = [];
  for (const check of checks) {
    const matched = check.regex.test(combined);
    if (matched !== check.expect) {
      issues.push(
        createIssue({
          screen,
          category: "commerce",
          severity: check.severity,
          title: check.title,
          evidence: [`Static scan of ${sourceFiles.join(", ")} — pattern ${check.id} ${check.expect ? "missing" : "unexpected"}`],
          recommendation: check.recommendation,
          source: "static",
        }),
      );
    }
    check.regex.lastIndex = 0;
  }
  return issues;
}

export function buildAttentionHeuristic(screen: string, sourceFiles: string[], root = process.cwd()): VisualAttentionReport {
  const combined = sourceFiles
    .map((file) => {
      try {
        return readFileSync(join(root, file), "utf8");
      } catch {
        return "";
      }
    })
    .join("\n");

  if (screen === "pdp") {
    const primary = /ProductImage|gallery|hero/i.test(combined) ? "Product image" : "Unknown — verify screenshot";
    const secondary = /price|₽/i.test(combined) ? "Price" : "Price block";
    const third = /(addToCart|В корзину|Купить)/i.test(combined) ? "Primary CTA" : "Secondary actions";
    const notes: string[] = [];
    if (primary !== "Product image") {
      notes.push("PDP source lacks obvious hero — screenshot review required to confirm hierarchy.");
    }
    if (/secondary/i.test(third) && /primary/i.test(combined)) {
      notes.push("Potential competing actions — verify primary CTA visual mass in screenshot.");
    }
    return { primary, secondary, third, notes };
  }

  if (screen === "catalog") {
    return {
      primary: "Product image grid",
      secondary: "Price",
      third: "Product title",
      notes: ["Validate card rhythm and whitespace in screenshot review."],
    };
  }

  if (screen === "cart") {
    return {
      primary: "Line items",
      secondary: "Order total",
      third: "Checkout CTA",
      notes: ["Checkout CTA should win attention over secondary links."],
    };
  }

  return {
    primary: "Screen header",
    secondary: "Primary content",
    third: "Navigation / CTA",
    notes: ["Generic heuristic — supplement with screenshot evidence."],
  };
}

export function reviewAttentionHierarchy(
  screen: string,
  sourceFiles: string[],
  root = process.cwd(),
): DesignReviewIssue[] {
  const report = buildAttentionHeuristic(screen, sourceFiles, root);
  const issues: DesignReviewIssue[] = [];

  if (screen === "pdp" && report.primary !== "Product image") {
    issues.push(
      createIssue({
        screen,
        category: "hierarchy",
        severity: "P1",
        title: "PDP primary attention may not be product media",
        evidence: [`Attention heuristic primary=${report.primary}`, ...report.notes],
        recommendation: "Ensure product image is first visible element on PDP.",
        source: "static",
      }),
    );
  }

  if (screen === "pdp" && report.third.includes("Secondary")) {
    issues.push(
      createIssue({
        screen,
        category: "hierarchy",
        severity: "P1",
        title: "PDP primary attention may equal secondary button",
        evidence: [`Primary: ${report.primary}`, `Third: ${report.third}`, ...report.notes],
        recommendation: "Increase primary CTA visual mass above secondary actions.",
        source: "static",
      }),
    );
  }

  return issues;
}
