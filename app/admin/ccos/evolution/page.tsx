import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AdminCcosEvolutionDashboard } from "@/features/ccos/components/admin-ccos-evolution-dashboard";
import { buildEvolutionHealthReport, listCandidates } from "@/lib/ccos/evolution";
import { isCcosEvolutionPlatformEnabled } from "@/lib/ccos/evolution/flags";

export const metadata = {
  title: "CCOS Evolution",
};

export default function AdminCcosEvolutionPage() {
  const enabled = isCcosEvolutionPlatformEnabled();
  const health = buildEvolutionHealthReport();
  const candidates = enabled ? listCandidates() : [];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="font-heading text-2xl font-semibold tracking-tight">CCOS Evolution Engine</h2>
        <p className="text-sm text-muted-foreground">
          Wave 6 — Candidate → Validation → Shadow → Human Approval → Promotion → Monitoring → Rollback
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Evolution Control</CardTitle>
          <CardDescription>
            {enabled
              ? "Platform enabled — use admin APIs for candidate lifecycle"
              : "Set CCOS_EVOLUTION_PLATFORM_ENABLED=true on staging to activate"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AdminCcosEvolutionDashboard health={health} candidates={candidates} />
        </CardContent>
      </Card>
    </div>
  );
}
