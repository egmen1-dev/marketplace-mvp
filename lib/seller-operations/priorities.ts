import { buildCandidateTasks } from "./tasks";
import type { SellerDailyPriority } from "./types";
import type { OrderOperationsSnapshot } from "./types";
import type { ProductAttentionItem } from "./types";

const MAX_PRIORITIES = 5;

export function getSellerDailyPriorities(input: {
  orders: OrderOperationsSnapshot;
  products: ProductAttentionItem[];
  availableBalance: number;
  aiAction: { title: string; why: string; ctaLabel: string; ctaHref: string };
}): SellerDailyPriority[] {
  const candidates = buildCandidateTasks(input);
  const seen = new Set<string>();
  const unique = candidates
    .sort((a, b) => b.score - a.score)
    .filter((task) => {
      if (seen.has(task.ctaHref + task.title)) return false;
      seen.add(task.ctaHref + task.title);
      return true;
    })
    .slice(0, MAX_PRIORITIES);

  return unique.map((task, index) => ({
    rank: index + 1,
    id: task.id,
    category: task.category,
    priority: task.priority,
    title: task.title,
    why: task.why,
    ctaLabel: task.ctaLabel,
    ctaHref: task.ctaHref,
  }));
}
