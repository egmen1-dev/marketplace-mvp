import { readFileSync, statSync } from "node:fs";

import { createIssue } from "../review/fix-loop";
import type { VisualReviewInput, VisualReviewProvider, VisualReviewResult } from "../types";

/** Provider-independent heuristic reviewer — no model lock-in. */
export class HeuristicVisualReviewProvider implements VisualReviewProvider {
  readonly providerVersion = "heuristic-visual-1.0.0";

  async review(input: VisualReviewInput): Promise<VisualReviewResult> {
    const issues = [];
    let width = input.metadata.width;
    let height = input.metadata.height;

    try {
      const pngHeader = readFileSync(input.screenshotPath).subarray(0, 24);
      if (pngHeader[0] === 0x89 && pngHeader[1] === 0x50) {
        width = pngHeader.readUInt32BE(16);
        height = pngHeader.readUInt32BE(20);
      }
    } catch {
      issues.push(
        createIssue({
          screen: input.screen,
          category: "visual",
          severity: "P0",
          title: "Screenshot file unreadable",
          evidence: [`Cannot read ${input.screenshotPath}`],
          recommendation: "Re-capture PNG screenshot from physical Android device.",
          source: "screenshot",
        }),
      );
    }

    const stats = safeStat(input.screenshotPath);
    if (stats && stats.size < 10_000) {
      issues.push(
        createIssue({
          screen: input.screen,
          category: "visual",
          severity: "P1",
          title: "Screenshot file suspiciously small",
          evidence: [`File size ${stats.size} bytes for ${width}x${height}`],
          recommendation: "Verify screenshot captured full screen, not blank/error surface.",
          source: "screenshot",
        }),
      );
    }

    if (width < 720 || height < 1280) {
      issues.push(
        createIssue({
          screen: input.screen,
          category: "visual",
          severity: "P2",
          title: "Screenshot resolution below common Android baseline",
          evidence: [`Captured ${width}x${height}`],
          recommendation: "Capture on primary physical device matrix (≥1080x2400 preferred).",
          source: "screenshot",
        }),
      );
    }

    if (!input.metadata.device || input.metadata.device === "unknown") {
      issues.push(
        createIssue({
          screen: input.screen,
          category: "trust",
          severity: "P2",
          title: "Screenshot metadata missing device identity",
          evidence: ["metadata.device is empty or unknown"],
          recommendation: "Record physical device model in metadata.json.",
          source: "screenshot",
        }),
      );
    }

    const attention = buildScreenshotAttention(input);

    if (input.screenKind === "seller" && input.screen === "seller_home") {
      issues.push(...reviewSellerHomeScreenshot(input, width, height));
    }

    return { issues, attention, providerVersion: this.providerVersion };
  }
}

function safeStat(path: string) {
  try {
    return statSync(path);
  } catch {
    return null;
  }
}

function buildScreenshotAttention(input: VisualReviewInput) {
  if (input.screen === "pdp") {
    return {
      primary: "Product image (verify in screenshot)",
      secondary: "Price",
      third: "Primary CTA",
      notes: ["Confirm hero occupies upper third of viewport."],
    };
  }
  return {
    primary: "Header / hero region",
    secondary: "Primary content block",
    third: "Bottom navigation / CTA",
    notes: [`Screenshot ${input.metadata.width}x${input.metadata.height} captured on ${input.metadata.device}`],
  };
}

function reviewSellerHomeScreenshot(input: VisualReviewInput, width: number, height: number) {
  const issues = [];
  if (input.screenKind !== "seller") return issues;

  issues.push(
    createIssue({
      screen: input.screen,
      category: "commerce",
      severity: "INFO",
      title: "Seller screen requires revenue-first hierarchy validation",
      evidence: [
        `Physical screenshot ${width}x${height} available`,
        "Validate Today/tasks block above passive metrics",
        "Validate money block uses seller revenue tokens",
      ],
      recommendation: "Ensure operational tasks dominate seller home — not buyer catalog patterns.",
      source: "screenshot",
    }),
  );

  return issues;
}

export function reviewSellerDesignGate(input: VisualReviewInput, issues: ReturnType<typeof createIssue>[]): ReturnType<typeof createIssue>[] {
  if (input.screenKind !== "seller") return issues;
  return [
    ...issues,
    createIssue({
      screen: input.screen,
      category: "conversion",
      severity: "INFO",
      title: "Seller rubric: verify action clarity and revenue focus",
      evidence: [
        "Seller screens must not reuse buyer conversion heuristics blindly",
        "Check operational priority, data density, mobile ergonomics",
      ],
      recommendation: "Apply seller-specific blueprint checks from EPIC 86.",
      source: "screenshot",
    }),
  ];
}
