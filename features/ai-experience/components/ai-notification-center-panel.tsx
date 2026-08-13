"use client";

import Link from "next/link";

import { Button } from "@/components/ui/button";
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

export type InboxNotification = {
  id: string;
  type: string;
  title: string;
  body: string;
  href?: string;
  createdAt: string;
  read: boolean;
};

type AiNotificationCenterPanelProps = {
  notifications: InboxNotification[];
};

export function AiNotificationCenterPanel({
  notifications,
}: AiNotificationCenterPanelProps) {
  function onOpen(notification: InboxNotification) {
    if (
      notification.type === "TRUST_WARNING" ||
      notification.type === "TRUST_IMPROVEMENT" ||
      notification.type === "TRANSACTION_PROTECTION"
    ) {
      trackEvent({
        event: ANALYTICS_EVENTS.TRUST_VIEW,
        route: ROUTES.NOTIFICATIONS,
        entityId: notification.id,
      });
      return;
    }

    trackEvent({
      event: ANALYTICS_EVENTS.AI_NOTIFICATION_OPEN,
      route: ROUTES.NOTIFICATIONS,
      entityId: notification.id,
    });
  }

  if (notifications.length === 0) {
    return (
      <Card data-testid="ai-notification-center">
        <CardHeader>
          <CardTitle>Уведомления</CardTitle>
          <CardDescription>
            Внутренний inbox — без push и email. Новые рекомендации появятся
            здесь.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <ul className="space-y-3" data-testid="ai-notification-center">
      {notifications.map((n) => (
        <li key={n.id}>
          <Card data-testid={`ai-notification-${n.type.toLowerCase()}`}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">{n.title}</CardTitle>
              <CardDescription>{n.type.replace(/_/g, " ")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>{n.body}</p>
              {n.href ? (
                <Button
                  size="sm"
                  variant="outline"
                  nativeButton={false}
                  render={
                    <Link href={n.href} onClick={() => onOpen(n)} />
                  }
                >
                  Открыть
                </Button>
              ) : null}
            </CardContent>
          </Card>
        </li>
      ))}
    </ul>
  );
}
