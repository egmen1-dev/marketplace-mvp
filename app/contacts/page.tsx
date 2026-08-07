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
      description="По вопросам заказов и сотрудничества напишите на support@lot.example. Форма обратной связи появится в следующих релизах."
      primaryHref={ROUTES.SUPPORT}
      primaryLabel="В поддержку"
    />
  );
}
