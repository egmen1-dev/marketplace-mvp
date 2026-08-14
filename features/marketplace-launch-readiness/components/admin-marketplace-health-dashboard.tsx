"use client";

import { useEffect, useTransition } from "react";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { trackProductionHealthViewAction } from "@/lib/marketplace-launch-readiness/actions";
import type { MarketplaceHealthDashboard } from "@/lib/marketplace-launch-readiness/types";

type AdminMarketplaceHealthDashboardProps = {
  data: MarketplaceHealthDashboard;
};

export function AdminMarketplaceHealthDashboard({
  data,
}: AdminMarketplaceHealthDashboardProps) {
  const [, startTransition] = useTransition();

  useEffect(() => {
    if (!data.enabled) return;
    startTransition(() => {
      void trackProductionHealthViewAction();
    });
  }, [data.enabled]);

  if (!data.enabled) {
    return (
      <p className="text-sm text-muted-foreground">
        MARKETPLACE_LAUNCH_READINESS_ENABLED=false
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-6" data-testid="admin-marketplace-health">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Orders</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p>Today: {data.ordersToday}</p>
            <p>Pending: {data.ordersPending}</p>
            <p>Failed/cancelled today: {data.ordersFailed}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Payments</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p>Success rate: {data.paymentSuccessRate}%</p>
            <p>Failures total: {data.paymentFailures}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Delivery</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p>Overdue: {data.deliveryDelays}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Sellers</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p>Active: {data.sellersActive}</p>
            <p>Blocked: {data.sellersBlocked}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Trust</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p>Reviews: {data.reviewsCount}</p>
            <p>Moderation pending: {data.moderationPending}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
