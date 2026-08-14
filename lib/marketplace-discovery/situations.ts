import type { DiscoverySituation } from "./types";

export const DISCOVERY_SITUATIONS: DiscoverySituation[] = [
  { id: "gift", emoji: "🎁", label: "Хочу подарок", queryHint: "подарок", maxPrice: 3000 },
  { id: "home", emoji: "🏠", label: "Сделать уютнее дом", queryHint: "дом" },
  { id: "repair", emoji: "🔧", label: "Что-то для ремонта", queryHint: "инструмент" },
  { id: "car", emoji: "🚗", label: "Для машины", queryHint: "авто" },
  { id: "kids", emoji: "👶", label: "Для ребенка", queryHint: "дет" },
  { id: "fun", emoji: "✨", label: "Найти что-нибудь интересное", queryHint: "" },
  { id: "self", emoji: "💪", label: "Для себя", queryHint: "" },
];
