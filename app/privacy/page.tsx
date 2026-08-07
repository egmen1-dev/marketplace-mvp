import { PlaceholderPage } from "@/components/layout/placeholder-page";
import { APP_NAME } from "@/lib/constants";

export const metadata = {
  title: "Политика конфиденциальности",
  description: `Как ${APP_NAME} обрабатывает данные пользователей.`,
};

export default function PrivacyPage() {
  return (
    <PlaceholderPage
      title="Политика конфиденциальности"
      description={`${APP_NAME} обрабатывает данные аккаунта, заказов и избранного только для работы сервиса: вход, оформление покупок, доставка и поддержка. Мы не продаём персональные данные третьим лицам. По вопросам обработки данных напишите через страницу «Контакты».`}
      primaryHref="/contacts"
      primaryLabel="Контакты"
    />
  );
}
