import { Palette } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DEFAULT_RELEASE,
  buildDesignReviewReport,
  loadLatestReport,
} from "@/lib/product-design-review/report/builder";
import { reviewAllScreens } from "@/lib/product-design-review/review/orchestrator";

export async function DesignQualityPanel() {
  const release = process.env.DESIGN_REVIEW_RELEASE ?? DEFAULT_RELEASE;
  let report = loadLatestReport(release);
  if (!report) {
    const results = await reviewAllScreens(release);
    report = buildDesignReviewReport(results, release);
  }

  const verdictColor = (verdict: string) => {
    if (verdict === "PASS") return "default";
    if (verdict === "WATCH") return "secondary";
    return "destructive";
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Palette className="h-4 w-4" /> Design Quality — Release {release}
        </CardTitle>
        <CardDescription>
          EPIC 87 evidence-based design review. Scores advisory — issues + screenshot evidence are source of truth.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2 text-sm">
          <Badge variant={report.finalVerdicts.prDesignGate === "READY" ? "default" : "destructive"}>
            PR Gate: {report.finalVerdicts.prDesignGate}
          </Badge>
          <Badge variant="outline">P0: {report.summary.p0}</Badge>
          <Badge variant="outline">P1: {report.summary.p1}</Badge>
          <Badge variant="outline">P2: {report.summary.p2}</Badge>
          <Badge variant="outline">Baseline: {report.finalVerdicts.physicalBaselineCoverage}</Badge>
          <Badge variant={report.sellerSprint1 === "UNBLOCKED" ? "default" : "secondary"}>
            Seller Sprint 1: {report.sellerSprint1}
          </Badge>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="py-2 pr-4">Screen</th>
                <th className="py-2 pr-4">Verdict</th>
                <th className="py-2 pr-4">Confidence</th>
                <th className="py-2 pr-4">P0</th>
                <th className="py-2 pr-4">P1</th>
                <th className="py-2 pr-4">P2</th>
              </tr>
            </thead>
            <tbody>
              {report.screens.map((screen) => {
                const p0 = screen.issues.filter((i) => i.severity === "P0").length;
                const p1 = screen.issues.filter((i) => i.severity === "P1").length;
                const p2 = screen.issues.filter((i) => i.severity === "P2").length;
                return (
                  <tr key={screen.screen} className="border-b border-border/60">
                    <td className="py-2 pr-4 font-medium capitalize">{screen.screen.replace(/_/g, " ")}</td>
                    <td className="py-2 pr-4">
                      <Badge variant={verdictColor(screen.verdict)}>{screen.verdict}</Badge>
                    </td>
                    <td className="py-2 pr-4">{screen.confidence}</td>
                    <td className="py-2 pr-4">{p0}</td>
                    <td className="py-2 pr-4">{p1}</td>
                    <td className="py-2 pr-4">{p2}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <p className="text-xs text-muted-foreground">
          API: GET /api/admin/product-ops/design-quality · CLI: npm run design:review · Gate: npm run product:design-gate
        </p>
      </CardContent>
    </Card>
  );
}
