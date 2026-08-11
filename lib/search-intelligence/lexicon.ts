/**
 * Centralized search lexicon (AGENT-020, sections 6/8/10). Synonyms, brands,
 * units and colors — one source of truth, never hardcoded across the project.
 */

/** Groups of equivalent search terms (normalized, ё→е). */
export const SYNONYM_GROUPS: string[][] = [
  ["ушм", "болгарка", "угловая шлифовальная машина", "шлифмашина угловая"],
  ["ноут", "ноутбук", "laptop", "лэптоп"],
  ["смартфон", "телефон", "айфон", "iphone", "мобильник"],
  ["минимойка", "мойка высокого давления", "мойка", "аппарат высокого давления"],
  ["шуруповерт", "аккумуляторка", "дрель-шуруповерт", "шуруповёрт"],
  ["перфоратор", "бур", "перфораторный"],
  ["тепловая пушка", "теплопушка", "пушка тепловая"],
  ["телевизор", "тв", "телек"],
  ["наушники", "гарнитура", "затычки"],
  ["холодильник", "холодос"],
  ["стиральная машина", "стиралка", "машинка стиральная"],
  ["пылесос", "пылик"],
  ["компрессор", "насос воздушный"],
  ["велосипед", "велик"],
  ["кроссовки", "кеды"],
  ["духи", "парфюм", "туалетная вода"],
];

const SYNONYM_INDEX = new Map<string, Set<string>>();
for (const group of SYNONYM_GROUPS) {
  const set = new Set(group);
  for (const term of group) SYNONYM_INDEX.set(term, set);
}

/** Return equivalent terms for a phrase/token (excluding itself). */
export function expandSynonyms(term: string): string[] {
  const set = SYNONYM_INDEX.get(term);
  if (!set) return [];
  return [...set].filter((t) => t !== term);
}

/** All lexicon terms (for spell-correction vocabulary). */
export function synonymVocabulary(): string[] {
  return [...SYNONYM_INDEX.keys()];
}

/** Known brands (normalized). */
export const BRANDS = new Set<string>([
  "makita", "bosch", "dewalt", "kolner", "ballu", "ресанта", "karcher", "керхер",
  "интерскол", "зубр", "patriot", "hyundai", "elitech", "hammer", "metabo",
  "bort", "dexter", "sturm", "wester",
  "samsung", "xiaomi", "redmi", "apple", "iphone", "asus", "lenovo", "hp",
  "acer", "huawei", "honor", "realme", "poco", "sony", "lg", "philips", "dyson",
  "nike", "adidas", "puma", "reebok",
]);

export function isBrand(token: string): boolean {
  return BRANDS.has(token);
}

/** Unit aliases → canonical unit. */
const UNIT_MAP: Record<string, string> = {
  вт: "Вт", ватт: "Вт", w: "Вт",
  квт: "кВт", kw: "кВт",
  в: "В", вольт: "В", v: "В",
  ач: "Ач", ah: "Ач",
  л: "л", литр: "л", литра: "л", литров: "л", l: "л",
  мм: "мм", mm: "мм",
  дюйм: "дюйм", "\"": "дюйм",
  гб: "ГБ", gb: "ГБ",
  тб: "ТБ", tb: "ТБ",
  гц: "Гц", hz: "Гц",
};

export function canonicalUnit(unit: string): string | null {
  return UNIT_MAP[unit.toLowerCase()] ?? null;
}

/** Regex alternation of known unit aliases (longest first). */
export const UNIT_ALTERNATION = Object.keys(UNIT_MAP)
  .filter((u) => /^[a-zа-я"]+$/i.test(u))
  .sort((a, b) => b.length - a.length)
  .join("|");

/** Common colors (attribute, unit "цвет"). */
export const COLORS = new Set<string>([
  "красный", "синий", "черный", "белый", "зеленый", "желтый", "серый",
  "оранжевый", "розовый", "голубой", "фиолетовый", "бежевый", "коричневый",
]);
