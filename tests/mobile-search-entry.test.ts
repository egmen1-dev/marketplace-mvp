import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const headerSource = readFileSync("apps/mobile/src/components/CommerceHeader.tsx", "utf8");
const catalogSource = readFileSync("apps/mobile/app/(tabs)/catalog.tsx", "utf8");
const searchBarSource = readFileSync("apps/mobile/src/components/ui/CommerceSearchBar.tsx", "utf8");

describe("mobile search entry from header", () => {
  it("header search navigates to catalog focus mode", () => {
    expect(headerSource).toContain('pathname: "/(tabs)/catalog"');
    expect(headerSource).toContain("focusSearch");
  });

  it("catalog focuses search input when focusSearch=1", () => {
    expect(catalogSource).toContain('params.focusSearch === "1"');
    expect(catalogSource).toContain("searchInputRef.current?.focus()");
  });

  it("CommerceSearchBar supports inputRef for focus", () => {
    expect(searchBarSource).toContain("inputRef");
  });
});
