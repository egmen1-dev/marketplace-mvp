import { PlaceholderPage } from "@/components/layout/placeholder-page";
import { ROUTES } from "@/lib/constants";

export const metadata = {
  title: "Как продавать",
};

export default function SellPage() {
  return (
    <PlaceholderPage
      title="Как продавать"
      description="Зарегистрируйтесь как продавец, заполните магазин и добавьте товары в кабинете. Подробный гайд появится позже — пока можно сразу перейти в кабинет."
      primaryHref={ROUTES.SELLER}
      primaryLabel="Кабинет продавца"
    />
  );
}
