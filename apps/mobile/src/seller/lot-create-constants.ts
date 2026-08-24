export const LOT_CONDITION_OPTIONS = [
  { id: "NEW" as const, label: "Новый" },
  { id: "REFURBISHED" as const, label: "Как новый" },
  { id: "USED" as const, label: "Б/у" },
];

/** Top-level category groups for seller LOT creation (taxonomy root children). */
export const LOT_CATEGORY_GROUPS: Array<{ emoji: string; keywords: string[] }> = [
  { emoji: "🔨", keywords: ["строй", "инструмент", "ремонт"] },
  { emoji: "💻", keywords: ["компьютер", "электрон", "телефон", "ноутбук"] },
  { emoji: "🏠", keywords: ["дом", "мебель", "быт", "кухн"] },
  { emoji: "🚗", keywords: ["авто", "мото", "шины"] },
  { emoji: "👕", keywords: ["одежд", "обув", "мода"] },
  { emoji: "🌡", keywords: ["климат", "кондицион", "обогрев"] },
];

export function emojiForCategoryName(name: string): string {
  const lower = name.toLowerCase();
  const match = LOT_CATEGORY_GROUPS.find((g) => g.keywords.some((k) => lower.includes(k)));
  return match?.emoji ?? "📦";
}
