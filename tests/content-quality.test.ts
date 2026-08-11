import { describe, expect, it } from "vitest";

import { scoreContentQuality } from "@/lib/search/content-quality";

describe("ProductContentQualityScore", () => {
  it("gives a near-complete card a high score", () => {
    const res = scoreContentQuality({
      title: "Тепловая пушка Ballu BHP-P-5 5 кВт",
      description:
        "Электрическая тепловая пушка для гаража и стройплощадки. Быстрый прогрев, три режима, защита от перегрева.",
      hasCategory: true,
      hasProductType: true,
      requiredCharacteristics: 2,
      filledRequiredCharacteristics: 2,
      optionalCharacteristics: 2,
      filledOptionalCharacteristics: 2,
      imageCount: 4,
      hasMainImage: true,
      price: 8990,
      stock: 12,
    });
    expect(res.score).toBeGreaterThanOrEqual(90);
    expect(res.hints.length).toBe(0);
  });

  it("gives an empty card a low score with actionable hints", () => {
    const res = scoreContentQuality({
      title: "Товар",
      description: "",
      hasCategory: false,
      hasProductType: false,
      requiredCharacteristics: 3,
      filledRequiredCharacteristics: 0,
      optionalCharacteristics: 2,
      filledOptionalCharacteristics: 0,
      imageCount: 0,
      hasMainImage: false,
      price: 0,
      stock: 0,
    });
    expect(res.score).toBeLessThan(30);
    expect(res.hints).toContain("Выберите тип товара — это включит характеристики и фильтры.");
    expect(res.hints).toContain("Добавьте главное фото товара.");
    expect(res.hints.length).toBeGreaterThanOrEqual(5);
  });

  it("is monotonic: filling required characteristics raises the score", () => {
    const partial = scoreContentQuality({
      title: "Ноутбук AeroBook 14 Intel i5 16 ГБ",
      description: "Ультрабук для работы и учёбы, лёгкий корпус, быстрый SSD.",
      hasCategory: true,
      hasProductType: true,
      requiredCharacteristics: 4,
      filledRequiredCharacteristics: 1,
      optionalCharacteristics: 1,
      filledOptionalCharacteristics: 0,
      imageCount: 2,
      hasMainImage: true,
      price: 64990,
      stock: 5,
    });
    const full = scoreContentQuality({
      title: "Ноутбук AeroBook 14 Intel i5 16 ГБ",
      description: "Ультрабук для работы и учёбы, лёгкий корпус, быстрый SSD.",
      hasCategory: true,
      hasProductType: true,
      requiredCharacteristics: 4,
      filledRequiredCharacteristics: 4,
      optionalCharacteristics: 1,
      filledOptionalCharacteristics: 1,
      imageCount: 4,
      hasMainImage: true,
      price: 64990,
      stock: 5,
    });
    expect(full.score).toBeGreaterThan(partial.score);
  });
});
