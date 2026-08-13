import { buildDiscoverySection } from "./feeds";
import type { DiscoveryFeedSection } from "./types";

export async function buildGiftSections(): Promise<DiscoveryFeedSection[]> {
  return Promise.all([
    buildDiscoverySection({
      id: "gift-1000",
      title: "Подарок до 1 000 ₽",
      emoji: "🎁",
      description: "Небольшие, но приятные идеи",
      sort: "price_asc",
      maxPrice: 1000,
      pageSize: 6,
    }),
    buildDiscoverySection({
      id: "gift-3000",
      title: "Подарок до 3 000 ₽",
      emoji: "🎁",
      description: "Баланс цены и впечатления",
      sort: "popular",
      maxPrice: 3000,
      pageSize: 6,
    }),
    buildDiscoverySection({
      id: "gift-premium-look",
      title: "Выглядит дороже цены",
      emoji: "✨",
      description: "WOW-эффект без переплаты",
      sort: "popular",
      pageSize: 6,
      href: "/discover/collections/podarki-dorozhe-ceny",
    }),
    buildDiscoverySection({
      id: "gift-unusual",
      title: "Необычный подарок",
      emoji: "🎲",
      description: "То, что запомнят",
      sort: "newest",
      pageSize: 6,
    }),
  ]);
}
