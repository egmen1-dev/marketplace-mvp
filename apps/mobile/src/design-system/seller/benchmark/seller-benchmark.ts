/** Marketplace benchmark — product principles only (EPIC 86) */

export const SELLER_BENCHMARKS = [
  "Wildberries Seller",
  "Ozon Seller",
  "Авито Pro",
  "Amazon Seller",
  "Shopify",
  "Kaspi Seller",
] as const;

export type SellerBenchmarkPrinciple = {
  source: (typeof SELLER_BENCHMARKS)[number];
  principle: string;
  lotApplication: string;
};

export const SELLER_BENCHMARK_PRINCIPLES: SellerBenchmarkPrinciple[] = [
  {
    source: "Wildberries Seller",
    principle: "Today-first dashboard — задачи дня выше списков",
    lotApplication: "Seller Home блок «Сегодня» — первый экран, не метрики",
  },
  {
    source: "Ozon Seller",
    principle: "Financial transparency — баланс и выплаты на виду",
    lotApplication: "Блок «Деньги» с available/pending на Home и Finance",
  },
  {
    source: "Авито Pro",
    principle: "Action cards — одна карточка = одно действие",
    lotApplication: "SellerTaskCard, SellerInsightCard — без таблиц",
  },
  {
    source: "Amazon Seller",
    principle: "Performance health — red/yellow/green статусы",
    lotApplication: "SellerPriorityBanner + SellerStatusChip",
  },
  {
    source: "Shopify",
    principle: "Revenue narrative — история роста, не CRUD",
    lotApplication: "Блок «Рост магазина» + Analytics sprint",
  },
  {
    source: "Kaspi Seller",
    principle: "Order SLA urgency — срочность обработки",
    lotApplication: "SellerOrderQueue + needAction badges on tab",
  },
];

export const SELLER_BENCHMARK_ANTI_PATTERNS = [
  "Копировать WB/Ozon layout pixel-perfect",
  "Admin table grids на мобильном",
  "CRUD формы создания товара",
  "Отдельное «меню настроек» без revenue context",
  "Placeholder metrics без API",
] as const;
