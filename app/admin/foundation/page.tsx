import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AdminFoundationDashboard } from "@/features/marketplace-foundation-audit";
import { getMarketplaceFoundationReport } from "@/lib/marketplace-foundation-audit";

export const metadata = {
  title: "Foundation Audit",
};

export default async function AdminFoundationPage() {
  const report = await getMarketplaceFoundationReport();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="font-heading text-2xl font-semibold tracking-tight">
          Marketplace Foundation
        </h2>
        <p className="text-sm text-muted-foreground">
          Readiness audit before scaling AI layers — buyer, seller, orders, payments, trust.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Foundation Readiness</CardTitle>
          <CardDescription>
            Core marketplace flow must work without AI modules
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AdminFoundationDashboard report={report} />
        </CardContent>
      </Card>
    </div>
  );
}
