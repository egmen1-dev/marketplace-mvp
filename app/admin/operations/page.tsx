import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AdminOperationsDashboard } from "@/features/marketplace-foundation-audit";
import { getAdminOperationsOverview } from "@/lib/marketplace-foundation-audit";

export const metadata = {
  title: "Operations",
};

export default async function AdminOperationsPage() {
  const overview = await getAdminOperationsOverview();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="font-heading text-2xl font-semibold tracking-tight">
          Operations
        </h2>
        <p className="text-sm text-muted-foreground">
          Unified operator view: orders, sellers, products, finance, trust.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Seller Operations Health</CardTitle>
          <CardDescription>Live counts from marketplace data</CardDescription>
        </CardHeader>
        <CardContent>
          <AdminOperationsDashboard overview={overview} />
        </CardContent>
      </Card>
    </div>
  );
}
