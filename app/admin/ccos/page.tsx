import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AdminCcosReadinessDashboard } from "@/features/ccos";
import { getCcosReadinessWithAudit } from "@/lib/ccos/rc";

export const metadata = {
  title: "CCOS Readiness",
};

export default async function AdminCcosReadinessPage() {
  const { dashboard, dependencyAudit, evolutionReadiness } = getCcosReadinessWithAudit();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="font-heading text-2xl font-semibold tracking-tight">CCOS Readiness</h2>
        <p className="text-sm text-muted-foreground">
          EPIC 77 Release Candidate Freeze (RC-1) — platform audit before Wave 6 Evolution Engine.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>RC-1 Freeze</CardTitle>
          <CardDescription>
            Observation → Knowledge → Graph → Twin → staging validation → Evolution
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AdminCcosReadinessDashboard
            dashboard={dashboard}
            dependencyAudit={dependencyAudit}
            evolutionReadiness={evolutionReadiness}
          />
        </CardContent>
      </Card>
    </div>
  );
}
