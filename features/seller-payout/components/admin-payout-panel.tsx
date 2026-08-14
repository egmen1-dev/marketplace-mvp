"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { formatPrice } from "@/features/products/mappers";
import { ROUTES } from "@/lib/constants";
import {
  adminApprovePayoutAction,
  adminCompletePayoutAction,
  adminMarkPayoutProcessingAction,
  adminRejectPayoutAction,
} from "@/lib/seller-payout/actions";
import type { AdminPayoutDashboard } from "@/lib/seller-payout/types";
import type { AdminPayoutRequestDetail } from "@/lib/seller-payout/types";

type AdminPayoutPanelProps = {
  data: AdminPayoutDashboard;
};

export function AdminPayoutPanel({ data }: AdminPayoutPanelProps) {
  if (!data.enabled) {
    return (
      <Card data-testid="admin-payout-panel">
        <CardHeader>
          <CardTitle>Выплаты продавцам</CardTitle>
          <CardDescription>SELLER_PAYOUT_ENABLED=false</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-6" data-testid="admin-payout-panel">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="Ожидает обработки"
          value={String(data.pendingCount)}
        />
        <MetricCard
          label="Обязательства marketplace"
          value={formatPrice(data.totalObligations)}
        />
        <MetricCard
          label="Активные заявки"
          value={String(data.activeCount)}
        />
        <MetricCard label="Выплачено сегодня" value={formatPrice(data.paidToday)} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Очередь выплат</CardTitle>
          <CardDescription>Ручная обработка заявок продавцов</CardDescription>
        </CardHeader>
        <CardContent>
          {data.queue.length === 0 ? (
            <p className="text-sm text-muted-foreground">Нет активных заявок</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-2 pr-4">Продавец</th>
                    <th className="pb-2 pr-4">Сумма</th>
                    <th className="pb-2 pr-4">Дата</th>
                    <th className="pb-2 pr-4">Статус</th>
                    <th className="pb-2 pr-4">Способ</th>
                    <th className="pb-2" />
                  </tr>
                </thead>
                <tbody>
                  {data.queue.map((row) => (
                    <tr
                      key={row.requestId}
                      className="border-b last:border-0"
                      data-testid={`admin-payout-row-${row.requestId}`}
                    >
                      <td className="py-3 pr-4">{row.sellerName}</td>
                      <td className="py-3 pr-4 tabular-nums">
                        {formatPrice(row.amount)}
                      </td>
                      <td className="py-3 pr-4">
                        {new Date(row.requestedAt).toLocaleDateString("ru-RU")}
                      </td>
                      <td className="py-3 pr-4">
                        <Badge variant="secondary">{row.statusLabel}</Badge>
                      </td>
                      <td className="py-3 pr-4 text-muted-foreground">
                        {row.paymentMethodReference}
                      </td>
                      <td className="py-3">
                        <Link
                          href={`${ROUTES.ADMIN_PAYOUTS}/${row.requestId}`}
                          className="inline-flex h-8 items-center rounded-lg border border-border px-3 text-sm hover:bg-muted"
                        >
                          Открыть
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <article className="rounded-2xl border border-border bg-card p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 font-heading text-2xl font-semibold tabular-nums">{value}</p>
    </article>
  );
}

type AdminPayoutDetailPanelProps = {
  detail: AdminPayoutRequestDetail;
};

export function AdminPayoutDetailPanel({ detail }: AdminPayoutDetailPanelProps) {
  const [pending, startTransition] = useTransition();
  const [rejectNote, setRejectNote] = useState("");
  const { request } = detail;

  function run(action: () => Promise<{ ok: boolean; error?: string }>) {
    startTransition(async () => {
      const result = await action();
      if (!result.ok) window.alert(result.error ?? "Ошибка");
    });
  }

  return (
    <div className="flex flex-col gap-6" data-testid="admin-payout-detail">
      <Link
        href={ROUTES.ADMIN_PAYOUTS}
        className="inline-flex h-8 w-fit items-center rounded-lg px-3 text-sm hover:bg-muted"
      >
        ← Очередь выплат
      </Link>

      <Card>
        <CardHeader>
          <CardTitle>Заявка #{request.displayNumber}</CardTitle>
          <CardDescription>{detail.sellerName}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <dl className="grid gap-2 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-muted-foreground">Сумма</dt>
              <dd className="font-medium">{formatPrice(request.amount)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Доступный баланс</dt>
              <dd>{formatPrice(detail.availableBalance)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Способ</dt>
              <dd>
                {request.paymentMethodLabel} · {request.paymentMethodReference}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Статус</dt>
              <dd>
                <Badge>{request.statusLabel}</Badge>
              </dd>
            </div>
          </dl>

          {detail.payoutHistory.length > 0 && (
            <div>
              <p className="text-sm font-medium">История выплат продавца</p>
              <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                {detail.payoutHistory.map((h) => (
                  <li key={h.id}>
                    #{h.displayNumber} · {formatPrice(h.amount)} · {h.statusLabel}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <Button
              disabled={pending}
              onClick={() => run(() => adminApprovePayoutAction(request.id))}
            >
              {pending ? <Loader2 className="size-4 animate-spin" /> : "Одобрить"}
            </Button>
            <Button
              variant="secondary"
              disabled={pending}
              onClick={() =>
                run(() => adminMarkPayoutProcessingAction(request.id))
              }
            >
              В обработку
            </Button>
            <Button
              variant="default"
              disabled={pending}
              data-testid="admin-payout-complete"
              onClick={() =>
                run(() =>
                  adminCompletePayoutAction({
                    requestId: request.id,
                    externalReference: `manual-${request.displayNumber}`,
                  }),
                )
              }
            >
              Завершить выплату
            </Button>
          </div>

          <div className="flex flex-col gap-2 border-t pt-4">
            <Input
              placeholder="Комментарий при отклонении"
              value={rejectNote}
              onChange={(e) => setRejectNote(e.target.value)}
            />
            <Button
              variant="destructive"
              disabled={pending}
              onClick={() =>
                run(() =>
                  adminRejectPayoutAction({
                    requestId: request.id,
                    adminNote: rejectNote,
                  }),
                )
              }
            >
              Отклонить
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
