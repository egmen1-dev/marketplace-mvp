import { ROUTES } from "@/lib/constants";

import type { SettingsSection, SettingsUxView } from "./types";

export function buildSettingsSections(isSeller: boolean): SettingsSection[] {
  const sections: SettingsSection[] = [
    {
      id: "profile",
      title: "Профиль",
      emoji: "👤",
      items: [
        { label: "Имя", href: `${ROUTES.PROFILE}?edit=1` },
        { label: "Телефон", href: `${ROUTES.PROFILE}?edit=1` },
        { label: "Город", href: `${ROUTES.PROFILE}?edit=1` },
        { label: "Аватар", href: `${ROUTES.PROFILE}?edit=1` },
      ],
    },
    {
      id: "security",
      title: "Безопасность",
      emoji: "🔐",
      items: [
        { label: "Пароль", href: ROUTES.SETTINGS, hint: "Через email-вход" },
        { label: "Сессии", href: ROUTES.SETTINGS },
      ],
    },
    {
      id: "notifications",
      title: "Уведомления",
      emoji: "🔔",
      items: [
        { label: "Заказы", href: ROUTES.NOTIFICATIONS },
        { label: "Сообщения", href: ROUTES.ACCOUNT_MESSAGES },
        { label: "AI рекомендации", href: ROUTES.ACCOUNT_GROWTH },
      ],
    },
    {
      id: "payment",
      title: "Оплата",
      emoji: "💳",
      items: [
        { label: "Способы оплаты", href: ROUTES.CHECKOUT, hint: "При оформлении заказа" },
      ],
    },
    {
      id: "general",
      title: "Общие",
      emoji: "⚙️",
      items: [
        { label: "Язык", href: ROUTES.SETTINGS, hint: "Русский" },
        { label: "Тема", href: ROUTES.SETTINGS },
        { label: "Приватность", href: ROUTES.PRIVACY },
      ],
    },
  ];

  if (isSeller) {
    sections.splice(4, 0, {
      id: "sales",
      title: "Продажи",
      emoji: "🏪",
      items: [
        { label: "Мой магазин", href: ROUTES.ACCOUNT_BUSINESS },
        { label: "Баланс", href: ROUTES.ACCOUNT_BALANCE },
        { label: "Выплаты", href: ROUTES.ACCOUNT_PAYOUTS },
        { label: "Уведомления продавца", href: ROUTES.NOTIFICATIONS },
      ],
    });
  }

  return sections;
}

export function buildSettingsView(input: {
  email: string;
  isSeller: boolean;
}): SettingsUxView {
  return {
    enabled: true,
    email: input.email,
    sections: buildSettingsSections(input.isSeller),
  };
}
