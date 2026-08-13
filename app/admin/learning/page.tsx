import { AdminLearningCenterPanel } from "@/features/marketplace-learning";
import {
  getAdminLearningCenterDashboard,
  isMarketplaceLearningEnabled,
} from "@/lib/marketplace-learning";

export const metadata = {
  title: "Learning Center",
};

export default async function AdminLearningPage() {
  const data = isMarketplaceLearningEnabled()
    ? await getAdminLearningCenterDashboard()
    : {
        enabled: false,
        marketplaceExperiments: [],
        successfulPatterns: [],
        failedRecommendations: [],
        aiAccuracy: {
          score: 0,
          label: "Disabled",
          accepted: 0,
          improved: 0,
          total: 0,
          summary: "MARKETPLACE_LEARNING_ENABLED=false",
        },
        knowledgeBase: [],
      };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="font-heading text-2xl font-semibold tracking-tight">
          Marketplace Learning
        </h2>
        <p className="text-sm text-muted-foreground">
          Эксперименты AI-рекомендаций, outcomes и knowledge patterns — только
          аналитика, без изменения ranking.
        </p>
      </div>
      <AdminLearningCenterPanel data={data} />
    </div>
  );
}
