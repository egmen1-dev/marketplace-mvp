"use client";

import { useEffect } from "react";
import Link from "next/link";
import { ShieldAlert } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ANALYTICS_EVENTS } from "@/lib/analytics/events";
import { trackEvent } from "@/lib/analytics/client";
import { ROUTES } from "@/lib/constants";
import type { AdminTrustCenterDashboard } from "@/lib/trust-safety/types";

type AdminTrustCenterPanelProps = {
  data: AdminTrustCenterDashboard;
};

export function AdminTrustCenterPanel({ data }: AdminTrustCenterPanelProps) {
  useEffect(() => {
    if (!data.enabled) return;
    trackEvent({
      event: ANALYTICS_EVENTS.TRUST_VIEW,
      route: ROUTES.ADMIN_TRUST_CENTER,
    });
  }, [data.enabled]);

  if (!data.enabled) {
    return (
      <Card data-testid="admin-trust-center-panel">
        <CardHeader>
          <CardTitle>Trust Center</CardTitle>
          <CardDescription>TRUST_SAFETY_ENABLED=false</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-6" data-testid="admin-trust-center-panel">
      <Section
        title="Marketplace trust health"
        testId="admin-trust-health"
        items={data.marketplaceHealth}
      />
      <Section
        title="Seller risks"
        testId="admin-trust-seller-risks"
        items={data.sellerRisks}
      />
      <Section
        title="Products without trust"
        testId="admin-trust-weak-products"
        items={data.productsWithoutTrust}
        linkable
      />
      <Section
        title="Dispute overview"
        testId="admin-trust-disputes"
        items={data.disputeOverview}
      />
    </div>
  );
}

function Section({
  title,
  testId,
  items,
  linkable = false,
}: {
  title: string;
  testId: string;
  items: Array<{
    id: string;
    title: string;
    body: string;
    badge?: string;
    href?: string;
  }>;
  linkable?: boolean;
}) {
  return (
    <section data-testid={testId}>
      <div className="mb-3 flex items-center gap-2">
        <ShieldAlert className="size-5 text-primary" aria-hidden />
        <h3 className="font-heading text-lg font-semibold">{title}</h3>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {items.map((item) => (
          <Card key={item.id}>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center justify-between gap-2 text-base">
                <span>{item.title}</span>
                {item.badge ? (
                  <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium">
                    {item.badge}
                  </span>
                ) : null}
              </CardTitle>
              <CardDescription>{item.body}</CardDescription>
            </CardHeader>
            {linkable && item.href ? (
              <CardContent className="pt-0">
                <Link
                  href={item.href}
                  className="text-sm text-primary underline-offset-4 hover:underline"
                >
                  Открыть
                </Link>
              </CardContent>
            ) : null}
          </Card>
        ))}
        {items.length === 0 ? (
          <Card>
            <CardContent className="py-6 text-sm text-muted-foreground">
              Нет данных для отображения
            </CardContent>
          </Card>
        ) : null}
      </div>
    </section>
  );
}
