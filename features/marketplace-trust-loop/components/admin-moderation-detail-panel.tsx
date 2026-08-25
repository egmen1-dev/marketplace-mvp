"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  adminApproveProductAction,
  adminEscalateProductAction,
  adminNeedsChangesProductAction,
  adminRejectProductAction,
} from "@/lib/marketplace-trust-loop/reviews/actions";
import { ROUTES } from "@/lib/constants";
import { formatPrice } from "@/features/products/mappers";

type ModerationIssue = {
  code?: string;
  userMessage?: string;
  message?: string;
  remediation?: string;
  severity?: string;
};

type AuditEvent = {
  id: string;
  decision: string;
  reviewerType: string;
  previousStatus: string | null;
  newStatus: string;
  riskScore: number | null;
  createdAt: Date;
};

type AdminModerationDetailPanelProps = {
  product: {
    id: string;
    name: string;
    description: string | null;
    price: { toString(): string };
    stock: number;
    condition: string;
    city: string | null;
    status: string;
    contentVersion: number;
    publishedAt: Date | null;
    category: { name: string } | null;
    productType: { name: string } | null;
    images: Array<{ id: string; url: string; alt: string | null }>;
    characteristicValues: Array<{
      valueText: string | null;
      valueNumber: { toString(): string } | null;
      valueBoolean: boolean | null;
      definition: { name: string };
    }>;
    seller: { id: string; storeName: string; createdAt: Date };
    productModeration: {
      status: string;
      riskScore: number | null;
      policyVersion: string | null;
      systemRecommendation: string | null;
      reviewMode: string | null;
      stage: string | null;
      submittedAt: Date | null;
      reviewedAt: Date | null;
      notes: string | null;
      reasonCodes: unknown;
      rulesTriggered: unknown;
      issues: unknown;
      auditEvents: AuditEvent[];
    } | null;
  };
  sellerStats: {
    activeLots: number;
    previousRejects: number;
    previousApprovals: number;
  };
};

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function asIssues(value: unknown): ModerationIssue[] {
  return Array.isArray(value) ? (value as ModerationIssue[]) : [];
}

export function AdminModerationDetailPanel({ product, sellerStats }: AdminModerationDetailPanelProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const moderation = product.productModeration;

  function act(fn: (id: string, notes?: string) => Promise<{ ok: boolean }>, notes?: string) {
    startTransition(async () => {
      await fn(product.id, notes);
      router.refresh();
    });
  }

  const issues = asIssues(moderation?.issues);
  const reasonCodes = asStringArray(moderation?.reasonCodes);
  const rulesTriggered = asStringArray(moderation?.rulesTriggered);

  return (
    <div className="flex flex-col gap-6" data-testid="admin-moderation-detail">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Button
            variant="ghost"
            size="sm"
            className="mb-2 text-muted-foreground"
            nativeButton={false}
            render={<Link href={ROUTES.ADMIN_MODERATION} />}
          >
            ← Модерация
          </Button>
          <h1 className="font-heading text-2xl font-semibold tracking-tight">{product.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {product.category?.name ?? "—"} · {product.productType?.name ?? "—"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge>{product.status}</Badge>
          {moderation ? <Badge variant="secondary">{moderation.status}</Badge> : null}
          {moderation?.riskScore != null ? (
            <Badge variant="outline">Risk {moderation.riskScore}</Badge>
          ) : null}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-xl border p-4">
          <h2 className="font-medium">ЛОТ</h2>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {product.images.map((image) => (
              <img
                key={image.id}
                src={image.url}
                alt={image.alt ?? product.name}
                className="aspect-square rounded-lg border object-cover"
              />
            ))}
          </div>
          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between gap-2">
              <dt className="text-muted-foreground">Цена</dt>
              <dd>{formatPrice(Number(product.price))}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-muted-foreground">Количество</dt>
              <dd>{product.stock}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-muted-foreground">Состояние</dt>
              <dd>{product.condition}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-muted-foreground">Город</dt>
              <dd>{product.city ?? "—"}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-muted-foreground">contentVersion</dt>
              <dd>{product.contentVersion}</dd>
            </div>
          </dl>
          {product.description ? (
            <p className="mt-3 whitespace-pre-wrap text-sm text-muted-foreground">{product.description}</p>
          ) : null}
          {product.characteristicValues.length > 0 ? (
            <ul className="mt-3 space-y-1 text-sm">
              {product.characteristicValues.map((row, index) => (
                <li key={`${row.definition.name}-${index}`}>
                  {row.definition.name}:{" "}
                  {row.valueText ??
                    (row.valueNumber != null ? row.valueNumber.toString() : null) ??
                    (row.valueBoolean != null ? String(row.valueBoolean) : "—")}
                </li>
              ))}
            </ul>
          ) : null}
        </section>

        <div className="flex flex-col gap-4">
          <section className="rounded-xl border p-4">
            <h2 className="font-medium">Продавец</h2>
            <dl className="mt-2 space-y-1 text-sm">
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">Магазин</dt>
                <dd>{product.seller.storeName}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">Активных ЛОТов</dt>
                <dd>{sellerStats.activeLots}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">Одобрено ранее</dt>
                <dd>{sellerStats.previousApprovals}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">Отклонено ранее</dt>
                <dd>{sellerStats.previousRejects}</dd>
              </div>
            </dl>
          </section>

          <section className="rounded-xl border p-4">
            <h2 className="font-medium">Модерация</h2>
            <dl className="mt-2 space-y-1 text-sm">
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">Policy version</dt>
                <dd>{moderation?.policyVersion ?? "—"}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">System recommendation</dt>
                <dd>{moderation?.systemRecommendation ?? "—"}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">Review mode</dt>
                <dd>{moderation?.reviewMode ?? "—"} / {moderation?.stage ?? "—"}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">Submitted</dt>
                <dd>{moderation?.submittedAt?.toISOString() ?? "—"}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">Reviewed</dt>
                <dd>{moderation?.reviewedAt?.toISOString() ?? "—"}</dd>
              </div>
            </dl>
            {reasonCodes.length > 0 ? (
              <p className="mt-3 text-sm">
                <span className="text-muted-foreground">Reason codes: </span>
                {reasonCodes.join(", ")}
              </p>
            ) : null}
            {rulesTriggered.length > 0 ? (
              <p className="mt-1 text-sm">
                <span className="text-muted-foreground">Rules triggered: </span>
                {rulesTriggered.join(", ")}
              </p>
            ) : null}
            {issues.length > 0 ? (
              <ul className="mt-3 space-y-2 text-sm">
                {issues.map((issue, index) => (
                  <li key={`${issue.code ?? "issue"}-${index}`} className="rounded-lg bg-muted/40 p-2">
                    <p className="font-medium">{issue.userMessage ?? issue.message ?? issue.code}</p>
                    {issue.remediation ? (
                      <p className="text-muted-foreground">{issue.remediation}</p>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : null}
          </section>

          <section className="rounded-xl border p-4">
            <h2 className="font-medium">Действия</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button size="sm" disabled={pending} onClick={() => act(adminApproveProductAction)}>
                Опубликовать
              </Button>
              <Button
                size="sm"
                variant="secondary"
                disabled={pending}
                onClick={() => act(adminNeedsChangesProductAction, "Нужно исправить")}
              >
                Попросить исправить
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={pending}
                onClick={() => act(adminRejectProductAction)}
              >
                Отклонить
              </Button>
              <Button
                size="sm"
                variant="ghost"
                disabled={pending}
                onClick={() => act(adminEscalateProductAction)}
              >
                Эскалировать
              </Button>
            </div>
          </section>
        </div>
      </div>

      {moderation?.auditEvents.length ? (
        <section className="rounded-xl border p-4">
          <h2 className="font-medium">Audit</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {moderation.auditEvents.map((event) => (
              <li key={event.id} className="flex flex-wrap justify-between gap-2 border-b border-border/60 pb-2">
                <span>
                  {event.reviewerType} · {event.decision} · {event.previousStatus ?? "—"} → {event.newStatus}
                </span>
                <span className="text-muted-foreground">
                  risk {event.riskScore ?? "—"} · {event.createdAt.toISOString()}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
