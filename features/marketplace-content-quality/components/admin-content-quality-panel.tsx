"use client";

import type { AdminContentQualityDashboard } from "@/lib/marketplace-content-quality/types";

type AdminContentQualityPanelProps = {
  dashboard: AdminContentQualityDashboard;
};

export function AdminContentQualityPanel({ dashboard }: AdminContentQualityPanelProps) {
  if (!dashboard.enabled) {
    return (
      <p className="text-sm text-muted-foreground">
        Content Quality Intelligence выключен. Установите{" "}
        <code className="text-xs">MARKETPLACE_CONTENT_QUALITY_ENABLED=true</code>.
      </p>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2" data-testid="admin-content-quality-panel">
      <MetricCard title="Среднее качество карточек" value={dashboard.averageOverall} />
      <MetricCard title="Photo quality" value={dashboard.averagePhotoQuality} />
      <MetricCard title="Description quality" value={dashboard.averageDescriptionQuality} />
      <MetricCard title="SEO quality" value={dashboard.averageSeoQuality} />
      <MetricCard title="Consistency" value={dashboard.averageConsistency} />
      <MetricCard title="Manipulation attempts" value={dashboard.manipulationAttempts} raw />

      <section className="md:col-span-2 rounded-xl border p-4">
        <h2 className="font-medium">Hard gate failures</h2>
        <ul className="mt-2 space-y-1 text-sm">
          {dashboard.hardGateFailures.length === 0 ? (
            <li className="text-muted-foreground">Нет данных</li>
          ) : (
            dashboard.hardGateFailures.map((g) => (
              <li key={g.gate} className="flex justify-between">
                <span>{g.gate}</span>
                <span>{g.count}</span>
              </li>
            ))
          )}
        </ul>
      </section>

      <CategoryList title="Worst categories" items={dashboard.worstCategories} />
      <CategoryList title="Best categories" items={dashboard.bestCategories} />
    </div>
  );
}

function MetricCard({
  title,
  value,
  raw = false,
}: {
  title: string;
  value: number;
  raw?: boolean;
}) {
  return (
    <div className="rounded-xl border p-4">
      <p className="text-xs text-muted-foreground">{title}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">
        {value}
        {!raw ? <span className="text-sm font-normal text-muted-foreground">/100</span> : null}
      </p>
    </div>
  );
}

function CategoryList({
  title,
  items,
}: {
  title: string;
  items: Array<{ name: string; avgScore: number }>;
}) {
  return (
    <section className="rounded-xl border p-4">
      <h2 className="font-medium">{title}</h2>
      <ul className="mt-2 space-y-1 text-sm">
        {items.length === 0 ? (
          <li className="text-muted-foreground">Нет данных</li>
        ) : (
          items.map((c) => (
            <li key={c.name} className="flex justify-between gap-2">
              <span>{c.name}</span>
              <span className="tabular-nums">{c.avgScore}</span>
            </li>
          ))
        )}
      </ul>
    </section>
  );
}
