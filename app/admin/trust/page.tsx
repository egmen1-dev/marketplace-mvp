import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AdminTrustDashboard } from "@/features/marketplace-trust-loop";
import { getAdminTrustHealth } from "@/lib/marketplace-trust-loop";

export const metadata = { title: "Trust" };

export default async function AdminTrustPage() {
  const health = await getAdminTrustHealth();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="font-heading text-2xl font-semibold tracking-tight">
          Marketplace Trust
        </h2>
        <p className="text-sm text-muted-foreground">
          Reviews, reputation, moderation and content quality health
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Trust Dashboard</CardTitle>
          <CardDescription>Foundation trust loop metrics</CardDescription>
        </CardHeader>
        <CardContent>
          <AdminTrustDashboard health={health} />
        </CardContent>
      </Card>
    </div>
  );
}
