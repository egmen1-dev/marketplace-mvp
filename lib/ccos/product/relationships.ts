import type { ProductIdentity, ProductRelationship } from "./types";

export function buildProductRelationships(identity: ProductIdentity): ProductRelationship[] {
  const type = (identity.productType ?? identity.category ?? "").toLowerCase();
  if (type.includes("вентилятор")) {
    return [
      { type: "accessory", targetLabel: "Удлинитель", reason: "Часто нужен для размещения напольного вентилятора", confidence: 0.7 },
      { type: "complementary", targetLabel: "Сетевой фильтр", reason: "Защита и стабильное питание", confidence: 0.65 },
      { type: "complementary", targetLabel: "Увлажнитель", reason: "Комфортный микроклимат летом", confidence: 0.55 },
      { type: "upgrade", targetLabel: "Колонный вентилятор с пультом", reason: "Больше функций и дальность обдува", confidence: 0.5 },
      { type: "alternative", targetLabel: "Кондиционер", reason: "Сильнее охлаждает, но дороже", confidence: 0.6 },
    ];
  }
  return [];
}
