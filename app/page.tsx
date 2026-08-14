import {
  HeroSearch,
  HeroShowcase,
  HomeBenefits,
  HomeHeroCtas,
  HomeProductSection,
  HomeScrollTracker,
  HomeSellerCta,
  HomeStickyCatalog,
  MarketplaceStats,
  PopularCategories,
  TrustSection,
} from "@/components/home";
import { TrustStrip } from "@/components/trust";
import { DiscoveryHomeSection } from "@/features/marketplace-discovery";
import {
  BuyerHomeHeader,
  BuyerOnboardingBanner,
} from "@/features/marketplace-ux-completion";
import { getSessionUser } from "@/features/auth";
import {
  getBuyerHomeContext,
  getBuyerOnboardingState,
  isMarketplaceUxCompletionEnabled,
} from "@/lib/marketplace-ux-completion";
import {
  getHomeMarketplaceStats,
  getHomeNewProducts,
  getHomePopularProducts,
  getHomeRootCategories,
} from "@/lib/home/cached-data";
import { APP_NAME, ROUTES } from "@/lib/constants";

/** Always render with live DB — avoids ISR shell from a different DATABASE_URL at build. */
export const dynamic = "force-dynamic";

export default async function HomePage() {
  let categories: Awaited<ReturnType<typeof getHomeRootCategories>> = [];
  let popularProducts: Awaited<
    ReturnType<typeof getHomePopularProducts>
  >["items"] = [];
  let newProducts: Awaited<ReturnType<typeof getHomeNewProducts>>["items"] =
    [];
  let stats: Awaited<ReturnType<typeof getHomeMarketplaceStats>> | null =
    null;

  try {
    const [cats, popularResult, newResult, marketplaceStats] = await Promise.all(
      [
        getHomeRootCategories(),
        getHomePopularProducts(),
        getHomeNewProducts(),
        getHomeMarketplaceStats(),
      ],
    );
    categories = cats;
    popularProducts = popularResult.items;
    newProducts = newResult.items;
    stats = marketplaceStats;
  } catch (err) {
    console.error("[home]", err);
  }

  const featured = popularProducts[0] ?? null;
  const heroThumbnails = popularProducts.slice(1, 5);
  const showStats =
    stats != null &&
    (stats.products > 0 || stats.sellers > 0 || stats.categories > 0);

  const uxEnabled = isMarketplaceUxCompletionEnabled();

  const session = uxEnabled ? await getSessionUser() : null;
  const [buyerHome, buyerOnboarding] = session
    ? await Promise.all([
        getBuyerHomeContext(session.id),
        getBuyerOnboardingState(true),
      ])
    : [null, null];

  return (
    <div
      className={`home-marketplace flex flex-col${uxEnabled ? " home-marketplace--light" : ""}`}
    >
      <HomeScrollTracker />
      <HomeStickyCatalog />

      <section className="relative overflow-hidden border-b border-border">
        <div
          aria-hidden
          className="animate-hero-glow pointer-events-none absolute -top-32 left-1/2 h-[520px] w-[720px] -translate-x-1/2 rounded-full bg-[radial-gradient(ellipse_at_center,rgb(255_106_0_/_28%),transparent_68%)]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_bottom,transparent_40%,var(--background)_100%)]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.035] [background-image:linear-gradient(var(--foreground)_1px,transparent_1px),linear-gradient(90deg,var(--foreground)_1px,transparent_1px)] [background-size:56px_56px]"
        />

        <div className="relative mx-auto grid max-w-7xl items-center gap-8 px-4 py-8 sm:px-6 sm:py-12 lg:grid-cols-[minmax(0,1.12fr)_minmax(0,0.88fr)] lg:gap-14 lg:py-16">
          <div className="flex flex-col gap-4 sm:gap-5 lg:gap-7">
            <p className="font-heading text-xs font-medium tracking-[0.24em] text-primary uppercase sm:text-sm">
              Маркетплейс {APP_NAME}
            </p>

            <h1 className="home-hero-title max-w-2xl font-heading font-semibold text-foreground">
              Покупайте выгодно.
              <span className="block text-primary">Продавайте легко.</span>
            </h1>

            <p className="max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
              Тысячи товаров от магазинов и частных продавцов — с доставкой СДЭК
              по всей России.
            </p>

            <div className="lg:hidden">
              <HeroShowcase
                featured={featured}
                thumbnails={heroThumbnails}
                variant="compact"
              />
            </div>

            <div className="w-full max-w-2xl">
              <HeroSearch />
            </div>

            <HomeHeroCtas />
          </div>

          <div className="hidden lg:block">
            <HeroShowcase featured={featured} thumbnails={heroThumbnails} />
          </div>
        </div>

        <TrustStrip className="border-border/60 bg-surface/50" />
      </section>

      {buyerOnboarding?.showWelcome ? (
        <div className="mx-auto max-w-7xl px-4 pt-6 sm:px-6">
          <BuyerOnboardingBanner show />
        </div>
      ) : null}

      {buyerHome?.enabled ? <BuyerHomeHeader context={buyerHome} /> : null}

      <div className="content-visibility-auto">
        <DiscoveryHomeSection />
      </div>

      <div className="content-visibility-auto">
        <PopularCategories categories={categories} />
      </div>

      {showStats && stats ? (
        <div className="content-visibility-auto">
          <MarketplaceStats
            products={stats.products}
            sellers={stats.sellers}
            categories={stats.categories}
          />
        </div>
      ) : null}

      <div className="content-visibility-auto">
        <HomeProductSection
          title="Популярные товары"
          description="Самые востребованные предложения прямо сейчас."
          products={popularProducts}
          section="popular"
          catalogHref={ROUTES.CATALOG}
        />
      </div>

      <div className="content-visibility-auto">
        <HomeProductSection
          title="Новинки"
          description="Свежие поступления в каталоге."
          products={newProducts}
          section="new"
          catalogHref={`${ROUTES.CATALOG}?sort=newest`}
        />
      </div>

      <div className="content-visibility-auto">
        <HomeBenefits />
      </div>

      <div className="content-visibility-auto">
        <TrustSection />
      </div>

      <div className="content-visibility-auto">
        <HomeSellerCta />
      </div>
    </div>
  );
}
