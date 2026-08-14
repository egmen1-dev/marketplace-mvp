import type { TrustLevelId } from "@/lib/marketplace-trust-score/constants";

export type TrustLevelUx = {
  id: TrustLevelId;
  min: number;
  max: number;
  label: string;
  icon: string;
  tone: "positive" | "neutral" | "attention";
};

export const TRUST_LEVEL_UX: TrustLevelUx[] = [
  {
    id: "high",
    min: 90,
    max: 100,
    label: "Высокое доверие",
    icon: "⭐",
    tone: "positive",
  },
  {
    id: "good",
    min: 70,
    max: 89,
    label: "Хороший продавец",
    icon: "✓",
    tone: "positive",
  },
  {
    id: "needs_work",
    min: 50,
    max: 69,
    label: "Есть возможности роста",
    icon: "↗",
    tone: "neutral",
  },
  {
    id: "low",
    min: 0,
    max: 49,
    label: "Нужно внимание",
    icon: "!",
    tone: "attention",
  },
];

export function getTrustLevelUx(score: number): TrustLevelUx {
  const normalized = Math.min(100, Math.max(0, Math.round(score)));
  return (
    TRUST_LEVEL_UX.find((level) => normalized >= level.min && normalized <= level.max) ??
    TRUST_LEVEL_UX[TRUST_LEVEL_UX.length - 1]!
  );
}

export const TRUST_ACHIEVEMENTS = [
  {
    id: "fast_seller",
    icon: "🚚",
    title: "Быстрый продавец",
    description: "50 заказов отправлены вовремя",
    threshold: 50,
  },
  {
    id: "buyer_favorite",
    icon: "⭐",
    title: "Любимец покупателей",
    description: "20 положительных отзывов",
    threshold: 20,
  },
  {
    id: "reliable_delivery",
    icon: "📦",
    title: "Надёжная упаковка",
    description: "50 успешных доставок",
    threshold: 50,
  },
] as const;
