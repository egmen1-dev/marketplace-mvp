import { PlaceholderPage } from "@/components/layout/placeholder-page";
import { ROUTES } from "@/lib/constants";

export const metadata = {
  title: "Поддержка",
};

export default function SupportPage() {
  return (
    <PlaceholderPage
      title="Поддержка"
      description="Пока чат и тикеты в разработке. Напишите нам через страницу контактов — ответим по почте."
      primaryHref={ROUTES.CONTACTS}
      primaryLabel="Контакты"
    />
  );
}
