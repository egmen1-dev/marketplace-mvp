import { SellerRankingAcademyPanel } from "@/features/ranking-lab";
import { enforceSellerFirstEntry } from "@/lib/seller-first-entry/server";
import { ROUTES } from "@/lib/constants";
import {
  getProductLabReport,
  getRankingLab1000Report,
  isRankingLabEnabled,
} from "@/lib/ranking-lab";

export const metadata = { title: "Ranking Academy" };

export default async function RankingAcademyPage() {
  await enforceSellerFirstEntry(ROUTES.ACCOUNT_RANKING_ACADEMY);
  const enabled = isRankingLabEnabled();
  const report = enabled ? getRankingLab1000Report() : null;
  const sampleProductId =
    report?.ranked.find((r) => r.position >= 40 && r.position <= 55)?.product.id ??
    report?.ranked[Math.floor((report?.ranked.length ?? 0) / 2)]?.product.id ??
    null;
  const lab = sampleProductId ? getProductLabReport(sampleProductId) : null;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">Ranking Academy</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Персональные рекомендации по позиции — только лабораторный анализ, без влияния на поиск
        </p>
      </div>
      <SellerRankingAcademyPanel
        enabled={enabled}
        academy={lab?.academy ?? null}
        advisor={lab?.advisor ?? null}
        predictor={lab?.predictor ?? null}
      />
    </div>
  );
}
