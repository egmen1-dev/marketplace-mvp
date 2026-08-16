import { AdminRankingLabPanel } from "@/features/ranking-lab";
import { isRankingLabEnabled, getRankingLab1000Report } from "@/lib/ranking-lab";

export const metadata = { title: "Ranking Lab 1000" };

export default async function AdminRankingLabPage() {
  const enabled = isRankingLabEnabled();
  const report = enabled ? await getRankingLab1000Report() : null;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">Ranking Lab 1000</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Внутренняя лаборатория: 1000 товаров, importance engine, sensitivity, bad product gates
        </p>
      </div>
      <AdminRankingLabPanel
        enabled={enabled}
        dashboard={
          report?.marketplaceDashboard ?? {
            datasetSize: 0,
            algorithmVersion: "v1-lab",
            averageScore: 0,
            averageTrust: 0,
            averageSeo: 0,
            averageCtr: 0,
            averageConversion: 0,
            goodCardsPercent: 0,
            badCardsPercent: 0,
            topFactors: [],
            categoryQuality: [],
            qualityDistribution: [],
            heatmaps: { categoryScore: [], factorInfluence: [] },
          }
        }
        importance={report?.importance ?? []}
        badProductLab={
          report?.badProductLab ?? { verdict: "НЕТ", summary: "—", cases: [] }
        }
        sensitivity={report?.sensitivitySamples[0] ?? null}
        topExplanation={report?.topExplanations[0] ?? null}
      />
    </div>
  );
}
