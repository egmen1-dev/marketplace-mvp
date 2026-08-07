import { PlaceholderPage } from "@/components/layout/placeholder-page";
import { APP_NAME, ROUTES } from "@/lib/constants";

export const metadata = {
  title: "Условия использования",
  description: `Правила покупки и продажи на ${APP_NAME}.`,
};

export default function TermsPage() {
  return (
    <PlaceholderPage
      title="Условия использования"
      description={`${APP_NAME} — торговая площадка для покупателей и продавцов. Покупатели оформляют заказы и оплату на платформе; продавцы публикуют товары и обрабатывают заказы в кабинете. Размещая объявления, продавец подтверждает право продавать товар. Споры по заказам решаются через поддержку и статусы заказа в личном кабинете.`}
      primaryHref={ROUTES.CATALOG}
      primaryLabel="Открыть каталог"
    />
  );
}
