import type {
  BuyerIntent,
  BuyerIntentType,
  BuyerLevel,
  PurchaseIntent,
} from "@/lib/buyer-intelligence/types";

const RESEARCH_MARKERS = [
  "посоветуй",
  "подскажи",
  "какой",
  "какая",
  "какие",
  "лучший",
  "лучшая",
  "что выбрать",
  "что купить",
  "нужен",
  "нужна",
];

const COMPARISON_MARKERS = ["сравни", " или ", " vs ", "против", "лучше"];

const BUY_MARKERS = ["купить", "заказать", "оформить", "приобрести"];

const URGENT_MARKERS = ["сегодня", "срочно", "быстро", "сейчас", "немедленно"];

const CATEGORY_HINTS: Array<{
  keywords: string[];
  category: string | null;
  slug: string | null;
  intent: BuyerIntentType;
}> = [
  {
    keywords: ["дрель", "шуруповерт", "перфоратор", "болгарка"],
    category: "Дрели",
    slug: "drills",
    intent: "HOUSEHOLD_REPAIR",
  },
  {
    keywords: ["инструмент", "ремонт", "дом", "быт"],
    category: "Инструменты",
    slug: "tools",
    intent: "HOUSEHOLD_REPAIR",
  },
  {
    keywords: ["ноутбук", "компьютер", "айфон", "iphone", "телефон", "смартфон"],
    category: "Электроника",
    slug: "electronics",
    intent: "GENERAL",
  },
  {
    keywords: ["подарок", "подароч"],
    category: null,
    slug: "gift",
    intent: "GIFT",
  },
  {
    keywords: ["профессион", "pro", "бригада", "стройка"],
    category: null,
    slug: "pro",
    intent: "PROFESSIONAL",
  },
];

function normalizeQuery(query: string): string {
  return query.trim().toLowerCase().replace(/\s+/g, " ");
}

function extractBudget(query: string): number | null {
  const rubMatch = query.match(/(\d[\d\s]{2,})\s*(₽|руб|rub)/i);
  if (rubMatch) {
    const n = Number(rubMatch[1].replace(/\s/g, ""));
    if (Number.isFinite(n) && n > 0) return n;
  }
  const doMatch = query.match(/до\s+(\d[\d\s]{2,})/i);
  if (doMatch) {
    const n = Number(doMatch[1].replace(/\s/g, ""));
    if (Number.isFinite(n) && n > 0) return n;
  }
  return null;
}

function detectPurchaseIntent(query: string): PurchaseIntent {
  if (URGENT_MARKERS.some((m) => query.includes(m))) return "URGENT_PURCHASE";
  if (BUY_MARKERS.some((m) => query.includes(m))) return "READY_TO_BUY";
  if (COMPARISON_MARKERS.some((m) => query.includes(m))) return "COMPARISON";
  if (RESEARCH_MARKERS.some((m) => query.includes(m))) return "RESEARCH";
  return "RESEARCH";
}

function detectBuyerLevel(query: string): BuyerLevel {
  if (
    query.includes("профессион") ||
    query.includes("pro ") ||
    query.includes("бригада")
  ) {
    return "PRO";
  }
  if (
    query.includes("для дома") ||
    query.includes("быт") ||
    query.includes("нович")
  ) {
    return "BEGINNER";
  }
  return "INTERMEDIATE";
}

function detectCategoryHint(query: string): {
  category: string | null;
  slug: string | null;
  intent: BuyerIntentType;
} {
  for (const hint of CATEGORY_HINTS) {
    if (hint.keywords.some((k) => query.includes(k))) {
      return {
        category: hint.category,
        slug: hint.slug,
        intent: hint.intent,
      };
    }
  }
  return { category: null, slug: null, intent: "GENERAL" };
}

function buildNeeds(
  query: string,
  intent: BuyerIntentType,
  level: BuyerLevel,
): string[] {
  const needs: string[] = [];
  if (level === "BEGINNER" || query.includes("для дома")) {
    needs.push("простота");
  }
  if (query.includes("надеж") || query.includes("качеств")) {
    needs.push("надежность");
  }
  if (
    query.includes("дешев") ||
    query.includes("бюджет") ||
    query.includes("до ")
  ) {
    needs.push("доступная цена");
  }
  if (intent === "HOUSEHOLD_REPAIR") {
    needs.push("для бытовых задач");
  }
  if (intent === "PROFESSIONAL") {
    needs.push("профессиональная мощность");
  }
  if (needs.length === 0) {
    needs.push("подходящее качество", "удобство выбора");
  }
  return needs.slice(0, 4);
}

/** Rule-based search intent parser — advisory only. */
export function parseBuyerIntent(rawQuery: string): BuyerIntent {
  const query = normalizeQuery(rawQuery);
  const { category, slug, intent } = detectCategoryHint(query);
  const purchaseIntent = detectPurchaseIntent(query);
  const buyerLevel = detectBuyerLevel(query);
  const budget = extractBudget(rawQuery);

  return {
    rawQuery: rawQuery.trim(),
    category,
    categorySlug: slug,
    intent,
    purchaseIntent,
    buyerLevel,
    budget,
    needs: buildNeeds(query, intent, buyerLevel),
  };
}

export function purchaseIntentLabel(intent: PurchaseIntent): string {
  const map: Record<PurchaseIntent, string> = {
    RESEARCH: "Изучает варианты",
    COMPARISON: "Сравнивает товары",
    READY_TO_BUY: "Готов к покупке",
    URGENT_PURCHASE: "Срочная покупка",
  };
  return map[intent];
}

export function buyerIntentTypeLabel(intent: BuyerIntentType): string {
  const map: Record<BuyerIntentType, string> = {
    HOUSEHOLD_REPAIR: "Домашний ремонт",
    HOME_IMPROVEMENT: "Обустройство дома",
    PROFESSIONAL: "Профессиональное использование",
    GIFT: "Подарок",
    GENERAL: "Общий поиск",
  };
  return map[intent];
}
