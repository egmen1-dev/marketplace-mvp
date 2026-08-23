import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function walk(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry === "android" || entry === ".expo") continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      walk(full, acc);
    } else if (/\.(tsx|ts)$/.test(entry)) {
      acc.push(full);
    }
  }
  return acc;
}

const mobileFiles = walk("apps/mobile/app").concat(walk("apps/mobile/src"));

const fallbackHits: Array<{ file: string; pattern: string }> = [];
for (const file of mobileFiles) {
  const src = readFileSync(file, "utf8");
  if (/Linking\.openURL\s*\(/.test(src)) {
    fallbackHits.push({ file, pattern: "Linking.openURL" });
  }
}

const allowedPatterns = [
  "login.tsx",
  "checkout.tsx",
  "download-apk.ts",
  "UnsupportedClientScreen.tsx",
  "legal-links.ts",
  "web-handoff.ts",
];

describe("mobile web fallback audit", () => {
  it("documents all Linking.openURL call sites", () => {
    expect(fallbackHits.length).toBeGreaterThan(0);
    for (const hit of fallbackHits) {
      const allowed = allowedPatterns.some((p) => hit.file.includes(p));
      expect({ file: hit.file, allowed }).toMatchObject({ allowed: true });
    }
  });

  it("legal pages use centralized legal-links helper", () => {
    const profile = readFileSync("apps/mobile/src/components/ProfileMenu.tsx", "utf8");
    expect(profile).toContain("openLegalPage");
    expect(profile).not.toMatch(/Linking\.openURL/);
  });

  it("no WebBrowser dependency for commerce navigation", () => {
    const hasWebBrowser = mobileFiles.some((f) => readFileSync(f, "utf8").includes("expo-web-browser"));
    expect(hasWebBrowser).toBe(false);
  });
});
