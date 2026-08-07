import { PlaceholderPage } from "@/components/layout/placeholder-page";
import { ROUTES } from "@/lib/constants";

export const metadata = {
  title: "Поддержка",
  description: "Помощь покупателям и продавцам маркетплейса Лот.",
};

export default function SupportPage() {
  return (
    <PlaceholderPage
      title="Поддержка"
      description="Чат и тикеты в разработке. Пока пишите на support@lot.example — ответим по email. Для статуса заказа зайдите в «Мои заказы»."
      primaryHref={ROUTES.ORDERS}
      primaryLabel="Мои заказы"
    />
  );
}
