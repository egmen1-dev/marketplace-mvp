import { PlaceholderPage } from "@/components/layout/placeholder-page";
import { ROUTES } from "@/lib/constants";

export const metadata = {
  title: "Контакты",
};

export default function ContactsPage() {
  return (
    <PlaceholderPage
      title="Контакты"
      description="Связь с командой: support@lot.example (заглушка). Форма обратной связи появится в следующих релизах."
      primaryHref={ROUTES.SUPPORT}
      primaryLabel="В поддержку"
    />
  );
}
