import { getSessionUser } from "@/features/auth";
import {
  DISCOVERY_COLLECTIONS,
  DISCOVERY_SITUATIONS,
  getDailyFind,
  getDiscoveryHomeFeed,
  getPriceGameRound,
  isDiscoveryAiContextEnabled,
  isDiscoveryCollectionsEnabled,
  isDiscoveryDailyFindsEnabled,
  isDiscoveryPriceGameEnabled,
  isMarketplaceDiscoveryEnabled,
  listBuyerStories,
  loadSituationProductsAction,
} from "@/lib/marketplace-discovery";

import { DiscoveryBuyerStories } from "./discovery-buyer-stories";
import { DiscoveryCollectionsGrid } from "./discovery-collections-grid";
import { DiscoveryDailyBanner } from "./discovery-daily-banner";
import { DiscoveryDailyFind } from "./discovery-daily-find";
import { DiscoveryFeedSectionView } from "./discovery-feed-section";
import { DiscoveryPriceGame } from "./discovery-price-game";
import { DiscoverySituations } from "./discovery-situations";
import { DiscoveryViewTracker } from "./discovery-view-tracker";

export async function DiscoveryHomeSection() {
  if (!isMarketplaceDiscoveryEnabled()) return null;

  const session = await getSessionUser();
  const userId = session?.id ?? null;

  const [feed, daily, priceGame, stories] = await Promise.all([
    getDiscoveryHomeFeed(userId),
    isDiscoveryDailyFindsEnabled() ? getDailyFind(userId) : Promise.resolve(null),
    isDiscoveryPriceGameEnabled() ? getPriceGameRound() : Promise.resolve(null),
    listBuyerStories(4),
  ]);

  if (!feed.enabled) return null;

  const showDailyBanner =
    Boolean(userId) &&
    daily?.enabled &&
    daily.ready &&
    daily.item != null;

  return (
    <section
      className="border-b border-border bg-surface/30 py-10 sm:py-14"
      data-testid="discovery-home"
    >
      <DiscoveryViewTracker />
      <div className="mx-auto flex max-w-7xl flex-col gap-10 px-4 sm:px-6">
        <header className="flex flex-col gap-2">
          <p className="text-sm font-medium text-primary">Находки ЛОТ</p>
          <h2 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">
            Открывайте товары каждый день
          </h2>
          <p className="max-w-2xl text-sm text-muted-foreground sm:text-base">
            Curated-витрина для подарков, выгодных находок и неожиданных покупок —
            без бесконечной ленты.
          </p>
        </header>

        {showDailyBanner && daily?.item ? (
          <DiscoveryDailyBanner
            item={daily.item}
            personalized={daily.personalized}
          />
        ) : null}

        {feed.dailyFind ? <DiscoveryDailyFind item={feed.dailyFind} /> : null}

        {feed.sections.map((section) => (
          <DiscoveryFeedSectionView key={section.id} section={section} />
        ))}

        {isDiscoveryAiContextEnabled() ? (
          <DiscoverySituations
            situations={DISCOVERY_SITUATIONS}
            loadProducts={loadSituationProductsAction}
          />
        ) : null}

        {priceGame ? <DiscoveryPriceGame round={priceGame} /> : null}

        <DiscoveryBuyerStories stories={stories} />

        {isDiscoveryCollectionsEnabled() ? (
          <DiscoveryCollectionsGrid collections={DISCOVERY_COLLECTIONS} />
        ) : null}
      </div>
    </section>
  );
}
