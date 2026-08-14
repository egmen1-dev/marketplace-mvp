import Link from "next/link";

import { ROUTES } from "@/lib/constants";
import type { BuyerStory } from "@/lib/marketplace-discovery/types";

type DiscoveryBuyerStoriesProps = {
  stories: BuyerStory[];
};

export function DiscoveryBuyerStories({ stories }: DiscoveryBuyerStoriesProps) {
  if (stories.length === 0) return null;

  return (
    <section className="flex flex-col gap-4" data-testid="discovery-buyer-stories">
      <div>
        <h3 className="font-heading text-xl font-semibold">Истории покупателей</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Реальные выборы без раскрытия личности
        </p>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {stories.map((story) => (
          <Link
            key={story.id}
            href={`${ROUTES.PRODUCT}/${story.productId}`}
            className="rounded-2xl border border-border bg-card p-4 transition-colors hover:border-primary/40"
          >
            <p className="text-sm font-medium">{story.city} выбрал этот товар</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Причина: «{story.reason}»
            </p>
            <p className="mt-2 text-xs text-primary">{story.productTitle}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
