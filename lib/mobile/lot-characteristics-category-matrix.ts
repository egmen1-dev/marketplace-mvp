/**
 * Representative category matrix for P0.1 dynamic characteristics gates.
 * IDs/slugs reflect staging taxonomy as of RC10.2 physical validation.
 */

export type RepresentativeCategoryCase = {
  id: string;
  categoryName: string;
  productTypeName: string;
  productTypeSlug: string;
  requiredCharacteristicNames: string[];
  forbiddenRequiredNames: string[];
  sampleValue?: Record<string, { text?: string; number?: string }>;
};

export const REPRESENTATIVE_CATEGORY_MATRIX: RepresentativeCategoryCase[] = [
  {
    id: "power-tools-drills",
    categoryName: "Электроинструмент",
    productTypeName: "Дрели",
    productTypeSlug: "drills",
    requiredCharacteristicNames: ["Мощность"],
    forbiddenRequiredNames: ["Производительность", "Размер"],
    sampleValue: { power: { number: "800" } },
  },
  {
    id: "auto-accessories-compressor",
    categoryName: "Автоаксессуары",
    productTypeName: "Автомобильные компрессоры",
    productTypeSlug: "auto-compressors",
    requiredCharacteristicNames: ["Производительность"],
    forbiddenRequiredNames: ["Мощность", "Размер"],
    sampleValue: { performance: { number: "35" } },
  },
  {
    id: "auto-accessories-phone-mount",
    categoryName: "Автоаксессуары",
    productTypeName: "Держатели для телефона",
    productTypeSlug: "phone-mounts",
    requiredCharacteristicNames: [],
    forbiddenRequiredNames: ["Мощность", "Производительность", "Размер"],
  },
  {
    id: "clothing-dresses",
    categoryName: "Женская одежда",
    productTypeName: "Платья",
    productTypeSlug: "dresses-type",
    requiredCharacteristicNames: ["Размер"],
    forbiddenRequiredNames: ["Мощность", "Производительность"],
    sampleValue: { size: { text: "46" } },
  },
  {
    id: "footwear",
    categoryName: "Обувь",
    productTypeName: "Обувь",
    productTypeSlug: "footwear-type",
    requiredCharacteristicNames: ["Размер"],
    forbiddenRequiredNames: ["Мощность"],
  },
  {
    id: "furniture",
    categoryName: "Мебель",
    productTypeName: "Мебель",
    productTypeSlug: "furniture-type",
    requiredCharacteristicNames: [],
    forbiddenRequiredNames: ["Мощность", "Производительность"],
  },
  {
    id: "electronics-smartphones",
    categoryName: "Смартфоны",
    productTypeName: "Смартфоны",
    productTypeSlug: "smartphones",
    requiredCharacteristicNames: [],
    forbiddenRequiredNames: ["Мощность", "Размер"],
  },
  {
    id: "home-kitchen",
    categoryName: "Кухня",
    productTypeName: "Посуда",
    productTypeSlug: "kitchenware-type",
    requiredCharacteristicNames: [],
    forbiddenRequiredNames: ["Мощность", "Производительность"],
  },
];
