import { AdminRankingPanel } from "@/features/marketplace-ranking-intelligence";
import {
  getAdminRankingDashboard,
  isMarketplaceRankingIntelligenceEnabled,
} from "@/lib/marketplace-ranking-intelligence";

export const metadata = { title: "Ranking Center" };

export default async function AdminRankingPage() {
  const enabled = isMarketplaceRankingIntelligenceEnabled();
  const dashboard = enabled
    ? await getAdminRankingDashboard()
    : {
        enabled: false,
        algorithmVersion: "v1",
        marketplaceAverage: 0,
        averageTrust: 0,
        averageSeo: 0,
        averagePhotoQuality: 0,
        topFailureReasons: [],
        worstCategories: [],
        influences: [],
        runningExperiments: 0,
        rankingHealth: "attention" as const,
        experiments: [],
      };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          Ranking Center
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Intelligence-слой: версии алгоритма, quality gates и Ranking Lab
        </p>
      </div>
      <AdminRankingPanel dashboard={dashboard} />
    </div>
  );
}
