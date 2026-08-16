import type { CategoryKnowledgePack, ProductCategoryPackId, ProductIdentity } from "./types";

const PACKS: Record<ProductCategoryPackId, CategoryKnowledgePack> = {
  fans: {
    id: "fans",
    typicalMistakes: [
      "Главное фото без масштаба",
      "Не указана мощность и уровень шума",
      "Фото на cluttered фоне",
    ],
    bestPractices: [
      "Крупный план лопастей и корпуса",
      "Фото в интерьере для масштаба",
      "Указать режимы и диаметр",
    ],
    idealPhotos: ["hero close-up", "interior context", "remote/control", "dimensions"],
    typicalBenefits: ["охлаждение", "тихая работа", "экономия энергии"],
    criticalCharacteristics: ["мощность", "уровень шума", "диаметр", "скорости"],
  },
  flowers: {
    id: "flowers",
    typicalMistakes: ["Увядшие фото", "Нет размера букета", "Отсутствует уход"],
    bestPractices: ["Свежие фото", "Лента/упаковка", "Инструкция по уходу"],
    idealPhotos: ["hero bouquet", "scale", "packaging", "care card"],
    typicalBenefits: ["свежесть", "стойкость", "подарочная упаковка"],
    criticalCharacteristics: ["сорт", "количество", "длина стебля", "срок доставки"],
  },
  tools: {
    id: "tools",
    typicalMistakes: ["Нет фото комплектации", "Не указана мощность/аккумулятор"],
    bestPractices: ["Комплектация отдельным кадром", "Характеристики в фото инфографике"],
    idealPhotos: ["hero tool", "kit flat lay", "specs infographic"],
    typicalBenefits: ["надёжность", "мощность", "эргономика"],
    criticalCharacteristics: ["мощность", "тип питания", "комплектация"],
  },
  electronics: {
    id: "electronics",
    typicalMistakes: ["Размытые фото портов", "Нет гарантии/сертификатов в описании"],
    bestPractices: ["Чёткие фото интерфейсов", "Сравнительная инфографика"],
    idealPhotos: ["hero device", "ports", "box contents", "lifestyle"],
    typicalBenefits: ["функциональность", "совместимость", "гарантия"],
    criticalCharacteristics: ["модель", "совместимость", "гарантия"],
  },
  garden: {
    id: "garden",
    typicalMistakes: ["Сезон не указан", "Нет масштаба растения"],
    bestPractices: ["Фото в контексте сада", "Сезонность в описании"],
    idealPhotos: ["hero plant", "garden context", "size reference"],
    typicalBenefits: ["урожайность", "устойчивость", "простота ухода"],
    criticalCharacteristics: ["сорт", "зона", "срок посадки"],
  },
  construction: {
    id: "construction",
    typicalMistakes: ["Нет сертификатов", "Не указан расход/упаковка"],
    bestPractices: ["Фото упаковки и маркировки", "Технические параметры"],
    idealPhotos: ["hero material", "label close-up", "application photo"],
    typicalBenefits: ["прочность", "соответствие ГОСТ", "расход"],
    criticalCharacteristics: ["объём", "класс прочности", "назначение"],
  },
  generic: {
    id: "generic",
    typicalMistakes: ["Слабое главное фото", "Неполное описание"],
    bestPractices: ["Понятное главное фото", "Полные характеристики"],
    idealPhotos: ["hero", "details", "context"],
    typicalBenefits: ["качество", "соответствие описанию"],
    criticalCharacteristics: ["назначение", "основные параметры"],
  },
};

export function resolveCategoryPack(identity: ProductIdentity): CategoryKnowledgePack {
  const t = `${identity.productType ?? ""} ${identity.category ?? ""}`.toLowerCase();
  if (t.includes("вентилятор") || t.includes("fan")) return PACKS.fans;
  if (t.includes("цвет") || t.includes("flower")) return PACKS.flowers;
  if (t.includes("дрель") || t.includes("tool")) return PACKS.tools;
  if (t.includes("электрон") || t.includes("phone")) return PACKS.electronics;
  if (t.includes("сад") || t.includes("garden")) return PACKS.garden;
  if (t.includes("стро") || t.includes("construction")) return PACKS.construction;
  return PACKS.generic;
}

export function getCategoryPack(id: ProductCategoryPackId): CategoryKnowledgePack {
  return PACKS[id];
}

export { PACKS as CATEGORY_KNOWLEDGE_PACKS };
