/**
 * Notification channel adapters for Order Lifecycle.
 * In-app is wired now; email / push / telegram / SMS are stubs for later.
 */

export type NotificationChannel =
  | "in_app"
  | "email"
  | "push"
  | "telegram"
  | "sms";

export type OrderNotificationPayload = {
  orderId: string;
  orderNumber: string;
  userId: string;
  title: string;
  body: string;
  channels?: NotificationChannel[];
};

export type NotificationAdapter = {
  channel: NotificationChannel;
  send(payload: OrderNotificationPayload): Promise<void>;
};

const adapters: NotificationAdapter[] = [];

export function registerNotificationAdapter(
  adapter: NotificationAdapter,
): void {
  adapters.push(adapter);
}

/** Default in-app adapter — logs; UI can later read a notifications table. */
export const inAppNotificationAdapter: NotificationAdapter = {
  channel: "in_app",
  async send(payload) {
    if (process.env.NODE_ENV !== "test") {
      console.info("[notify:in_app]", {
        orderId: payload.orderId,
        userId: payload.userId,
        title: payload.title,
      });
    }
  },
};

registerNotificationAdapter(inAppNotificationAdapter);

/** Stubs so callers can request future channels without branching. */
export const emailNotificationAdapter: NotificationAdapter = {
  channel: "email",
  async send() {
    /* not configured */
  },
};
export const pushNotificationAdapter: NotificationAdapter = {
  channel: "push",
  async send() {
    /* not configured */
  },
};
export const telegramNotificationAdapter: NotificationAdapter = {
  channel: "telegram",
  async send() {
    /* not configured */
  },
};
export const smsNotificationAdapter: NotificationAdapter = {
  channel: "sms",
  async send() {
    /* not configured */
  },
};

registerNotificationAdapter(emailNotificationAdapter);
registerNotificationAdapter(pushNotificationAdapter);
registerNotificationAdapter(telegramNotificationAdapter);
registerNotificationAdapter(smsNotificationAdapter);

export async function dispatchOrderNotification(
  payload: OrderNotificationPayload,
): Promise<void> {
  const wanted = new Set(payload.channels ?? ["in_app"]);
  await Promise.allSettled(
    adapters
      .filter((a) => wanted.has(a.channel))
      .map((a) => a.send(payload)),
  );
}
