import type { AuditCheck } from "./types";

function scoreFromChecks(checks: AuditCheck[]): number {
  if (checks.length === 0) return 100;
  const weighted = checks.map((c): number => {
    if (c.passed) return 100;
    if (c.severity === "critical") return 0;
    if (c.severity === "warning") return 40;
    return 60;
  });
  return Math.round(weighted.reduce((a, b) => a + b, 0) / weighted.length);
}

export { scoreFromChecks };

export function buildAreaResult(input: {
  area: import("./types").AuditArea;
  title: string;
  checks: AuditCheck[];
  weight: number;
}): import("./types").AuditAreaResult {
  return {
    area: input.area,
    title: input.title,
    checks: input.checks,
    score: scoreFromChecks(input.checks),
    weight: input.weight,
  };
}

export function computeFoundationScore(
  areas: import("./types").AuditAreaResult[],
): import("./types").FoundationReadinessScore {
  const totalWeight = areas.reduce((sum, a) => sum + a.weight, 0);
  const weighted =
    totalWeight > 0
      ? areas.reduce((sum, a) => sum + (a.score * a.weight) / totalWeight, 0)
      : 0;
  const total = Math.round(weighted);

  let label: import("./types").FoundationReadinessScore["label"] = "ready";
  let headline = "Marketplace core ready";

  if (total < 70) {
    label = "critical";
    headline = "Critical gaps detected";
  } else if (total < 85) {
    label = "gaps";
    headline = "Foundation usable with known gaps";
  }

  return { total, label, headline, areas };
}
