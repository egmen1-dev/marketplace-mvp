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
      description="Статус заказа, доставка и возврат — в разделе «Мои заказы». Продавцам: управление товарами и заказами — в кабинете продавца. Общие вопросы — на странице «Контакты»."
      primaryHref={ROUTES.ORDERS}
      primaryLabel="Мои заказы"
    />
  );
}
