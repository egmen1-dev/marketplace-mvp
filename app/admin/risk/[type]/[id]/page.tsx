import { notFound } from "next/navigation";

import { prisma } from "@/lib/prisma";
import {
  explainProductRisk,
  explainSellerRisk,
  explainUserRisk,
} from "@/features/trust-risk/detail";
import { adminResolveRiskEvent } from "@/features/trust-risk/actions";
import { RiskEventRow } from "@/features/trust-risk/components/risk-event-row";
import type { TrustSignal } from "@/features/trust-risk/trust-engine";
import type { RiskSignal } from "@/features/trust-risk/risk-engine";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ type: string; id: string }>;
};

function SignalList({ signals }: { signals: Array<TrustSignal | RiskSignal> }) {
  if (!signals.length) {
    return <p className="text-sm text-muted-foreground">Нет активных сигналов.</p>;
  }
  return (
    <ul className="flex flex-col gap-1" data-testid="risk-explainability">
      {signals.map((s, i) => (
        <li key={i} className="flex items-center justify-between text-sm">
          <span>{s.label}</span>
          <span
            className={
              s.delta >= 0 ? "font-medium text-emerald-600" : "font-medium text-destructive"
            }
          >
            {s.delta >= 0 ? "+" : ""}
            {s.delta}
          </span>
        </li>
      ))}
    </ul>
  );
}

export default async function RiskEntityDetailPage({ params }: PageProps) {
  const { type, id } = await params;
  if (!["user", "seller", "product"].includes(type)) notFound();

  const detail =
    type === "seller"
      ? await explainSellerRisk(prisma, id)
      : type === "user"
        ? await explainUserRisk(prisma, id)
        : await explainProductRisk(prisma, id);

  if (!detail) notFound();

  const isProduct = detail.kind === "product";
  const scoreLabel = isProduct ? "Risk Score" : "Trust Score";
  const scoreValue = isProduct ? detail.risk.score : detail.trust.score;
  const signals = isProduct ? detail.risk.signals : detail.trust.signals;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-xs tracking-wide text-muted-foreground uppercase">
          {type === "seller" ? "Продавец" : type === "user" ? "Покупатель" : "Товар"}
        </p>
        <h1 className="font-heading text-2xl font-semibold">{detail.name}</h1>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:max-w-md">
        <div className="rounded-2xl border border-border bg-surface/40 p-4">
          <p className="text-xs text-muted-foreground">{scoreLabel}</p>
          <p className="mt-1 font-heading text-3xl font-semibold" data-testid="entity-score">
            {scoreValue}
          </p>
        </div>
        {!isProduct ? (
          <div className="rounded-2xl border border-border bg-surface/40 p-4">
            <p className="text-xs text-muted-foreground">Risk Score</p>
            <p className="mt-1 font-heading text-3xl font-semibold">{detail.riskScore}</p>
          </div>
        ) : null}
      </div>

      <section className="rounded-2xl border border-border bg-surface/40 p-4">
        <h2 className="font-heading text-lg font-medium">Объяснение (сигналы)</h2>
        <div className="mt-3">
          <SignalList signals={signals} />
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-heading text-lg font-medium">Риск-события</h2>
        {detail.events.length === 0 ? (
          <p className="text-sm text-muted-foreground">Событий нет.</p>
        ) : (
          detail.events.map((e) => (
            <RiskEventRow key={e.id} event={e} onResolve={adminResolveRiskEvent} />
          ))
        )}
      </section>
    </div>
  );
}
