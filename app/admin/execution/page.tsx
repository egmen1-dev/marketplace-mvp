import { AdminMarketplaceExecutionPanel } from "@/features/admin/components/admin-marketplace-execution-panel";
import {
  getMarketplaceExecutionDashboard,
  isMarketplaceExecutionEnabled,
} from "@/lib/marketplace-execution";

export const metadata = {
  title: "Marketplace Execution",
};

export default async function AdminExecutionPage() {
  const data = isMarketplaceExecutionEnabled()
    ? await getMarketplaceExecutionDashboard()
    : {
        enabled: false,
        activePlans: [],
        todaysPriorities: [],
        taskPipeline: [],
        completedTasks: [],
        progress: {
          tasksTotal: 0,
          tasksCompleted: 0,
          tasksInProgress: 0,
          impactScore: 0,
          completionRate: 0,
          weekSummary: ["MARKETPLACE_EXECUTION_ENABLED=false"],
        },
      };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="font-heading text-2xl font-semibold tracking-tight">
          AI Growth Execution Engine
        </h2>
        <p className="text-sm text-muted-foreground">
          Operator отвечает «что нужно сделать?» — Execution отвечает «как
          выполнить?» Все действия требуют подтверждения человека.
        </p>
      </div>
      <AdminMarketplaceExecutionPanel data={data} />
    </div>
  );
}
