import { SystemFlagsPanel, DemoScenariosPanel } from "@/features/marketplace-deploy-visibility";
import { getDemoScenarios, getSystemFlagsSnapshot } from "@/lib/marketplace-deploy-visibility";

export const metadata = { title: "System Flags" };

export const dynamic = "force-dynamic";

export default async function AdminSystemFlagsPage() {
  const [snapshot, scenarios] = await Promise.all([
    getSystemFlagsSnapshot(),
    Promise.resolve(getDemoScenarios()),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="font-heading text-2xl font-semibold tracking-tight">System Flags</h2>
        <p className="text-sm text-muted-foreground">
          Deployment visibility — commit SHA, feature flags, module matrix
        </p>
      </div>
      <SystemFlagsPanel snapshot={snapshot} />
      <DemoScenariosPanel scenarios={scenarios} />
    </div>
  );
}
