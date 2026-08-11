import type { RiskEventStatus, RiskSeverity } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import {
  getRiskCounters,
  listRiskEvents,
} from "@/features/trust-risk/risk-event-service";
import { adminResolveRiskEvent, adminScanRisks } from "@/features/trust-risk/actions";
import { RiskEventRow } from "@/features/trust-risk/components/risk-event-row";
import { ROUTES } from "@/lib/constants";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<{ severity?: string; status?: string; page?: string }>;
};

const SEVERITIES: RiskSeverity[] = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];
const STATUSES: RiskEventStatus[] = [
  "OPEN",
  "UNDER_REVIEW",
  "CONFIRMED",
  "DISMISSED",
  "RESOLVED",
];

export default async function AdminRiskPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const severity = SEVERITIES.includes(sp.severity as RiskSeverity)
    ? (sp.severity as RiskSeverity)
    : undefined;
  const status = STATUSES.includes(sp.status as RiskEventStatus)
    ? (sp.status as RiskEventStatus)
    : undefined;
  const page = Math.max(1, Number(sp.page) || 1);

  let counters = { high: 0, critical: 0, underReview: 0, open: 0 };
  let data: Awaited<ReturnType<typeof listRiskEvents>> = {
    items: [],
    total: 0,
    page: 1,
    pageSize: 25,
  };
  let error: string | null = null;
  try {
    [counters, data] = await Promise.all([
      getRiskCounters(prisma),
      listRiskEvents(prisma, { severity, status, page }),
    ]);
  } catch (err) {
    console.error("[admin/risk]", err);
    error = "Не удалось загрузить риск-центр.";
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-semibold">Риск-центр</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Анализ доверия и рисков. Автоматических блокировок нет — только
            рекомендации и решения администратора.
          </p>
        </div>
        <form action={adminScanRisks}>
          <button
            type="submit"
            data-testid="risk-scan"
            className="h-10 rounded-xl border border-border px-4 text-sm font-medium hover:border-primary/40"
          >
            Пересканировать риски
          </button>
        </form>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Открытые", value: counters.open },
          { label: "На проверке", value: counters.underReview },
          { label: "Высокий риск", value: counters.high },
          { label: "Критический", value: counters.critical },
        ].map((c) => (
          <div key={c.label} className="rounded-2xl border border-border bg-surface/40 p-4">
            <p className="text-xs text-muted-foreground">{c.label}</p>
            <p className="mt-1 font-heading text-2xl font-semibold">{c.value}</p>
          </div>
        ))}
      </div>

      <form method="get" action={ROUTES.ADMIN_RISK} className="flex flex-wrap gap-2">
        <select name="severity" defaultValue={sp.severity ?? ""} className="h-10 rounded-xl border border-input bg-surface px-2.5 text-sm">
          <option value="">Любая серьёзность</option>
          {SEVERITIES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <select name="status" defaultValue={sp.status ?? ""} className="h-10 rounded-xl border border-input bg-surface px-2.5 text-sm">
          <option value="">Любой статус</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <button type="submit" className="h-10 rounded-xl bg-primary px-4 text-sm font-medium text-primary-foreground">
          Фильтр
        </button>
      </form>

      {error ? (
        <p className="rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : (
        <div className="flex flex-col gap-3" data-testid="risk-events-list">
          {data.items.length === 0 ? (
            <p className="text-sm text-muted-foreground">Риск-событий не найдено.</p>
          ) : (
            data.items.map((e) => (
              <RiskEventRow key={e.id} event={e} onResolve={adminResolveRiskEvent} />
            ))
          )}
        </div>
      )}
    </div>
  );
}
