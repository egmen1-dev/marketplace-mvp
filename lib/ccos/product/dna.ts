import type { BuildProductUnderstandingInput, ProductDNA, ProductIdentity } from "./types";

const DNA_BY_TYPE: Record<string, Partial<ProductDNA>> = {
  вентилятор: {
    primaryNeed: "охлаждение",
    secondaryNeeds: ["комфорт", "циркуляция воздуха"],
    useCases: ["дом", "офис", "дача"],
    targetAudience: ["домашние покупатели", "офисные работники"],
    environment: ["жилые помещения", "офисы"],
    emotionalDrivers: ["прохлада", "спокойствие"],
    painPoints: ["жара", "духота", "шум"],
    benefits: ["охлаждение", "экономичность", "мобильность"],
  },
  пылесос: {
    primaryNeed: "чистота",
    secondaryNeeds: ["гигиена", "удобство"],
    useCases: ["дом", "офис"],
    targetAudience: ["семьи", "аллергики"],
    environment: ["квартира", "дом"],
    emotionalDrivers: ["порядок", "здоровье"],
    painPoints: ["пыль", "аллергены"],
    benefits: ["чистота", "мощность всасывания"],
  },
};

export function buildProductDNA(
  input: BuildProductUnderstandingInput,
  identity: ProductIdentity,
): ProductDNA {
  const key = (identity.productType ?? identity.category ?? input.title).toLowerCase();
  const template =
    Object.entries(DNA_BY_TYPE).find(([k]) => key.includes(k))?.[1] ?? {
      primaryNeed: "решение бытовой задачи",
      secondaryNeeds: ["удобство"],
      useCases: ["дом"],
      targetAudience: ["покупатели"],
      environment: ["повседневное использование"],
      emotionalDrivers: ["комфорт"],
      painPoints: ["неудобство"],
      benefits: ["практичность"],
    };

  return {
    primaryNeed: template.primaryNeed ?? "потребность",
    secondaryNeeds: template.secondaryNeeds ?? [],
    useCases: template.useCases ?? [],
    targetAudience: template.targetAudience ?? [],
    environment: template.environment ?? [],
    emotionalDrivers: template.emotionalDrivers ?? [],
    painPoints: template.painPoints ?? [],
    benefits: template.benefits ?? [],
  };
}
