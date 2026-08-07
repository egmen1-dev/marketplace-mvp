import { PlaceholderPage } from "@/components/layout/placeholder-page";
import { ROUTES } from "@/lib/constants";

export const metadata = {
  title: "Контакты",
  description: "Свяжитесь с командой маркетплейса Лот.",
};

export default function ContactsPage() {
  return (
    <PlaceholderPage
      title="Контакты"
      description="По вопросам заказа укажите номер заказа в личном кабинете — так быстрее разобраться. По сотрудничеству и работе продавцов откройте кабинет продавца или страницу «Продать товар»."
      primaryHref={ROUTES.SUPPORT}
      primaryLabel="В поддержку"
    />
  );
}
