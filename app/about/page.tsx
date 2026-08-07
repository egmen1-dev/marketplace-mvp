import { PlaceholderPage } from "@/components/layout/placeholder-page";
import { APP_NAME, ROUTES } from "@/lib/constants";

export const metadata = {
  title: "О нас",
  description: `${APP_NAME} — маркетплейс для покупки и продажи товаров с доставкой СДЭК.`,
};

export default function AboutPage() {
  return (
    <PlaceholderPage
      title={`О ${APP_NAME}`}
      description={`${APP_NAME} — маркетплейс, где покупатели находят товары, а продавцы ведут кабинет: каталог, заказы, оплата и доставка СДЭК. Мы развиваем платформу шаг за шагом.`}
      primaryHref={ROUTES.CATALOG}
      primaryLabel="Открыть каталог"
    />
  );
}
