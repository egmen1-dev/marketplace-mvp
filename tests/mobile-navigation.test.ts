import { describe, expect, it } from "vitest";

import { UserRole } from "@prisma/client";

import {
  buildMobileNavigationManifest,
  validateNavigationDeepLinks,
} from "@/lib/mobile/navigation";

describe("mobile navigation manifest", () => {
  it("validates deep link alignment", () => {
    expect(validateNavigationDeepLinks()).toBe(true);
  });

  it("returns guest nav without admin or seller sections", () => {
    const guest = buildMobileNavigationManifest({ authenticated: false });
    expect(guest.role).toBe("guest");
    expect(guest.items.map((i) => i.id)).toEqual(["home", "catalog"]);
  });

  it("returns buyer nav without seller business items", () => {
    const buyer = buildMobileNavigationManifest({ authenticated: true, role: UserRole.BUYER });
    expect(buyer.role).toBe("buyer");
    expect(buyer.items.some((i) => i.id === "business")).toBe(false);
    expect(buyer.items.some((i) => i.id === "orders")).toBe(true);
  });

  it("returns seller nav with business and wallet", () => {
    const seller = buildMobileNavigationManifest({ authenticated: true, role: UserRole.SELLER });
    expect(seller.role).toBe("seller");
    expect(seller.items.some((i) => i.id === "business")).toBe(true);
    expect(seller.items.some((i) => i.id === "wallet")).toBe(true);
  });

  it("does not expose admin-only nav to buyer", () => {
    const buyer = buildMobileNavigationManifest({ authenticated: true, role: UserRole.BUYER });
    expect(buyer.items.every((i) => i.roles.includes("buyer"))).toBe(true);
  });
});
