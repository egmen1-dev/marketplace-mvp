import { describe, expect, it } from "vitest";

import { computeCartPackageSummary } from "@/features/cart/lib/package-summary";
import type { CartView } from "@/features/cart/types";
import { updateProductSchema } from "@/features/products/schemas";
import { inferCharacteristicTypeFromName } from "@/lib/catalog-taxonomy/normalize";

describe("product dimensions validation", () => {
  it("requires all three dimensions when any is set", () => {
    const partial = updateProductSchema.safeParse({
      lengthCm: 10,
      widthCm: 5,
    });
    expect(partial.success).toBe(false);
  });

  it("accepts complete dimensions", () => {
    const ok = updateProductSchema.safeParse({
      lengthCm: 10,
      widthCm: 5,
      heightCm: 3,
      weight: 1.2,
    });
    expect(ok.success).toBe(true);
  });
});

describe("cart package summary for delivery", () => {
  it("aggregates weight and max dimensions", () => {
    const cart: CartView = {
      items: [
        {
          productId: "p1",
          quantity: 2,
          lineTotal: 200,
          product: {
            id: "p1",
            title: "A",
            slug: "a",
            price: 100,
            currency: "RUB",
            stock: 5,
            status: "ACTIVE",
            weight: 1,
            lengthCm: 30,
            widthCm: 20,
            heightCm: 10,
            primaryImage: null,
          },
        },
      ],
      itemCount: 2,
      subtotal: 200,
      currency: "RUB",
    };
    const pkg = computeCartPackageSummary(cart);
    expect(pkg.weightGrams).toBe(2000);
    expect(pkg.lengthCm).toBe(30);
    expect(pkg.widthCm).toBe(20);
    expect(pkg.heightCm).toBe(10);
  });
});

describe("color characteristic type inference", () => {
  it("maps Russian color names to COLOR", () => {
    expect(inferCharacteristicTypeFromName("Цвет", "SELECT")).toBe("COLOR");
    expect(inferCharacteristicTypeFromName("Основной цвет", "TEXT")).toBe(
      "COLOR",
    );
  });
});
