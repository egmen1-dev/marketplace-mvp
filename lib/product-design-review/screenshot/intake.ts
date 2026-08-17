import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import type { BaselineApprovalRecord, ScreenshotMetadata } from "../types";

export const DESIGN_REVIEW_ARTIFACT_ROOT = "artifacts/design-review";

export function screenshotDir(release: string, screen: string, root = process.cwd()): string {
  return join(root, DESIGN_REVIEW_ARTIFACT_ROOT, release, screen);
}

export function screenshotPath(release: string, screen: string, filename: string, root = process.cwd()): string {
  return join(screenshotDir(release, screen, root), filename);
}

export function metadataPath(release: string, screen: string, root = process.cwd()): string {
  return join(screenshotDir(release, screen, root), "metadata.json");
}

export function baselineManifestPath(release: string, root = process.cwd()): string {
  return join(root, DESIGN_REVIEW_ARTIFACT_ROOT, release, "baseline-manifest.json");
}

export function loadScreenshotMetadata(release: string, screen: string, root = process.cwd()): ScreenshotMetadata | null {
  const path = metadataPath(release, screen, root);
  if (!existsSync(path)) return null;
  return JSON.parse(readFileSync(path, "utf8")) as ScreenshotMetadata;
}

export function saveScreenshotMetadata(
  release: string,
  screen: string,
  metadata: ScreenshotMetadata,
  root = process.cwd(),
): void {
  const dir = screenshotDir(release, screen, root);
  mkdirSync(dir, { recursive: true });
  writeFileSync(metadataPath(release, screen, root), JSON.stringify(metadata, null, 2));
}

export function findScreenshotFile(release: string, screen: string, root = process.cwd()): string | null {
  const dir = screenshotDir(release, screen, root);
  if (!existsSync(dir)) return null;
  for (const name of ["screenshot.png", "screen.png", `${screen}.png`, "candidate.png"]) {
    const path = join(dir, name);
    if (existsSync(path)) return path;
  }
  return null;
}

export function loadBaselineManifest(release: string, root = process.cwd()): BaselineApprovalRecord[] {
  const path = baselineManifestPath(release, root);
  if (!existsSync(path)) return [];
  const parsed = JSON.parse(readFileSync(path, "utf8")) as { approvals?: BaselineApprovalRecord[] };
  return parsed.approvals ?? [];
}

export function saveBaselineApproval(
  record: BaselineApprovalRecord,
  root = process.cwd(),
): BaselineApprovalRecord[] {
  const existing = loadBaselineManifest(record.release, root);
  const next = existing.filter((r) => r.screen !== record.screen).concat(record);
  const dir = join(root, DESIGN_REVIEW_ARTIFACT_ROOT, record.release);
  mkdirSync(dir, { recursive: true });
  writeFileSync(
    baselineManifestPath(record.release, root),
    JSON.stringify({ version: "1.0.0", approvals: next }, null, 2),
  );
  return next;
}

export const SCREENSHOT_PRIVACY_RULES = [
  "Use test accounts only — never production PII in artifacts",
  "Redact email/phone in screenshots where appropriate",
  "Never store auth tokens, cookies, or payment credentials",
  "Sanitize diagnostic exports before upload",
] as const;
