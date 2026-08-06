import { PlaceholderPage } from "@/components/layout/placeholder-page";
import { APP_NAME } from "@/lib/constants";

export const metadata = {
  title: "О нас",
};

export default function AboutPage() {
  return (
    <PlaceholderPage
      title={`О ${APP_NAME}`}
      description={`${APP_NAME} — маркетплейс, где покупатели находят товары, а продавцы ведут свой кабинет. Страница с полной историей и командой появится позже.`}
    />
  );
}
