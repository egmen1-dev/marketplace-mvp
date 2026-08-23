import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { bootStageToUserMessage } from "../apps/mobile/src/boot/boot-stage-messages";

const catalogToolbar = readFileSync("apps/mobile/src/components/ui/CatalogToolbar.tsx", "utf8");
const categoryRail = readFileSync("apps/mobile/src/components/ui/CatalogToolbar.tsx", "utf8");
const bootScreen = readFileSync("apps/mobile/app/index.tsx", "utf8");
const bootSplash = readFileSync("apps/mobile/src/components/BootSplash.tsx", "utf8");
const productCard = readFileSync("apps/mobile/src/components/ui/ProductCard.tsx", "utf8");
const tabsLayout = readFileSync("apps/mobile/app/(tabs)/_layout.tsx", "utf8");
const feedback = readFileSync("apps/mobile/src/components/ui/feedback.tsx", "utf8");
const profileMenu = readFileSync("apps/mobile/src/components/ProfileMenu.tsx", "utf8");

describe("mobile visual polish — catalog controls", () => {
  it("uses compact Chip-based CategoryRail instead of giant circle layout", () => {
    expect(categoryRail).toContain("export function CategoryRail");
    expect(categoryRail).toContain("<Chip");
    expect(categoryRail).not.toMatch(/borderRadius:\s*9999|width:\s*72|height:\s*72/);
  });

  it("uses sort dropdown + filters bar instead of full-width sort pill row only", () => {
    expect(catalogToolbar).toContain("Сортировка:");
    expect(catalogToolbar).toContain("Фильтры");
    expect(catalogToolbar).toContain("<Modal");
  });
});

describe("mobile visual polish — boot experience", () => {
  it("renders branded BootSplash instead of raw ActivityIndicator loading", () => {
    expect(bootScreen).toContain("BootSplash");
    expect(bootScreen).not.toContain("ActivityIndicator");
  });

  it("shows human-readable boot messages without technical stage ids", () => {
    expect(bootSplash).toContain("bootStageToUserMessage");
    expect(bootStageToUserMessage("bootstrap")).toBe("Загружаем товары");
    expect(bootStageToUserMessage("session_restore")).toBe("Восстанавливаем сессию");
    expect(bootStageToUserMessage("api_health")).not.toContain("api_");
  });
});

describe("mobile visual polish — commerce invariants", () => {
  it("keeps reserved favorite slot on ProductCard", () => {
    expect(productCard).toContain("favoriteSlot");
    expect(productCard).toContain("reserveFavoriteSlot");
  });

  it("keeps Russian wallet tab title", () => {
    expect(tabsLayout).toContain('title: "Кошелёк"');
  });

  it("uses icon-based empty states instead of emoji-only placeholders", () => {
    expect(feedback).toContain("MaterialCommunityIcons");
    expect(feedback).not.toContain('emoji: "♡"');
  });

  it("keeps wallet label localized in profile menu", () => {
    expect(profileMenu).toContain('label: "Кошелёк"');
    expect(profileMenu).toContain('label: "Корзина"');
    expect(profileMenu).toContain('label: "Кабинет продавца"');
  });
});
