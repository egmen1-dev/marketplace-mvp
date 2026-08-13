"use client";

import { useEffect, useTransition } from "react";
import { Mail, Megaphone, Users } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  approveAndSendCommunicationMessageAction,
  approveCommunicationMessageAction,
} from "@/lib/marketplace-communication/actions";
import { ANALYTICS_EVENTS } from "@/lib/analytics/events";
import { trackEvent } from "@/lib/analytics/client";
import { ROUTES } from "@/lib/constants";
import type { MarketplaceCommunicationDashboard } from "@/lib/marketplace-communication/types";

type AdminMarketplaceCommunicationPanelProps = {
  data: MarketplaceCommunicationDashboard;
};

export function AdminMarketplaceCommunicationPanel({
  data,
}: AdminMarketplaceCommunicationPanelProps) {
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!data.enabled) return;
    trackEvent({
      event: ANALYTICS_EVENTS.COMMUNICATION_VIEW,
      route: ROUTES.ADMIN_COMMUNICATION,
    });
    if (data.activeCampaigns.length > 0) {
      trackEvent({
        event: ANALYTICS_EVENTS.COMMUNICATION_CAMPAIGN_CREATED,
        route: ROUTES.ADMIN_COMMUNICATION,
        entityId: String(data.activeCampaigns.length),
      });
    }
  }, [data.enabled, data.activeCampaigns.length]);

  if (!data.enabled) {
    return (
      <Card data-testid="admin-marketplace-communication-panel">
        <CardHeader>
          <CardTitle>Communication Engine выключен</CardTitle>
          <CardDescription>
            MARKETPLACE_COMMUNICATION_ENABLED=false
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  function approve(messageId: string, sendAfter: boolean) {
    startTransition(async () => {
      const result = sendAfter
        ? await approveAndSendCommunicationMessageAction(messageId)
        : await approveCommunicationMessageAction(messageId);
      if (!result.ok && result.error) window.alert(result.error);
    });
  }

  return (
    <div
      className="flex flex-col gap-6"
      data-testid="admin-marketplace-communication-panel"
    >
      <section data-testid="communication-active-campaigns">
        <div className="mb-3 flex items-center gap-2">
          <Megaphone className="size-5 text-primary" aria-hidden />
          <h3 className="font-heading text-lg font-semibold">Active campaigns</h3>
        </div>
        <div className="grid gap-3 lg:grid-cols-2">
          {data.activeCampaigns.map((campaign) => (
            <Card
              key={campaign.id}
              data-testid={`communication-campaign-${campaign.id}`}
            >
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{campaign.title}</CardTitle>
                <CardDescription>
                  {campaign.type} · {campaign.audience.label} (~
                  {campaign.estimatedReach})
                </CardDescription>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground">
                Status: {campaign.status} · source {campaign.source}
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section data-testid="communication-audiences">
        <div className="mb-3 flex items-center gap-2">
          <Users className="size-5 text-primary" aria-hidden />
          <h3 className="font-heading text-lg font-semibold">Audiences</h3>
        </div>
        <ul className="space-y-2 text-sm">
          {data.audiences.map((a) => (
            <li
              key={a.id}
              className="rounded-lg border border-border px-3 py-2"
              data-testid={`communication-audience-${a.kind}`}
            >
              <span className="font-medium">{a.label}</span> — {a.estimatedSize}{" "}
              <span className="text-muted-foreground">({a.source})</span>
            </li>
          ))}
        </ul>
      </section>

      <section data-testid="communication-templates">
        <div className="mb-3 flex items-center gap-2">
          <Mail className="size-5 text-primary" aria-hidden />
          <h3 className="font-heading text-lg font-semibold">Message templates</h3>
        </div>
        <div className="grid gap-3 lg:grid-cols-2">
          {data.templates.slice(0, 4).map((tpl) => (
            <Card key={tpl.id}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">{tpl.subject}</CardTitle>
                <CardDescription className="whitespace-pre-line text-xs">
                  {tpl.body.slice(0, 180)}
                  {tpl.body.length > 180 ? "…" : ""}
                </CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </section>

      <section data-testid="communication-pending-approval">
        <h3 className="mb-3 font-heading text-lg font-semibold">
          Pending approval
        </h3>
        {data.pendingApproval.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Нет сообщений, ожидающих approval
          </p>
        ) : (
          <ul className="space-y-3">
            {data.pendingApproval.map((msg) => (
              <li
                key={msg.id}
                className="rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-3"
                data-testid={`communication-message-${msg.id}`}
              >
                <p className="font-medium">{msg.subject}</p>
                <p className="mt-1 whitespace-pre-line text-sm text-muted-foreground">
                  {msg.body}
                </p>
                <div className="mt-3 flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={pending}
                    onClick={() => approve(msg.id, false)}
                  >
                    Одобрить
                  </Button>
                  <Button
                    size="sm"
                    disabled={pending}
                    onClick={() => approve(msg.id, true)}
                  >
                    Одобрить и отправить (in-app log)
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section data-testid="communication-results">
        <h3 className="mb-3 font-heading text-lg font-semibold">Results</h3>
        <Card>
          <CardContent className="space-y-2 pt-6 text-sm">
            {data.results.headlines.map((line) => (
              <p key={line}>{line}</p>
            ))}
            <p className="text-muted-foreground">
              Отправлено (logged): {data.results.messagesSent} · клики:{" "}
              {data.results.estimatedClicks}
            </p>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
