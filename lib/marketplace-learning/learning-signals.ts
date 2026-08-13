import type { MetricSnapshot } from "./types";

export function conversionRate(views: number, cart: number): number {
  if (views <= 0) return 0;
  return Math.round((cart / views) * 1000) / 1000;
}

export function metricSnapshot(input: {
  views: number;
  cart: number;
  orders: number;
}): MetricSnapshot {
  return {
    views: input.views,
    cart: input.cart,
    orders: input.orders,
    conversion: conversionRate(input.views, input.cart),
  };
}

export function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function qualityLabel(score: number): string {
  if (score >= 80) return "Высокое качество рекомендаций";
  if (score >= 55) return "Среднее качество рекомендаций";
  return "Низкое качество рекомендаций — нужно больше данных";
}
