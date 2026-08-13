import { requireSellerCabinetAccess } from "@/features/auth";
import { SellerOnboardingPanel } from "@/features/marketplace-education";
import {
  getSellerOnboardingChecklist,
  isMarketplaceEducationEnabled,
} from "@/lib/marketplace-education";
import { ROUTES } from "@/lib/constants";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Старт продавца",
};

export default async function AccountOnboardingPage() {
  const seller = await requireSellerCabinetAccess(ROUTES.ACCOUNT_ONBOARDING);
  const educationEnabled = isMarketplaceEducationEnabled();

  if (!educationEnabled) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          Старт продавца
        </h1>
        <p className="text-sm text-muted-foreground">
          Обучающий слой скоро будет доступен на площадке.
        </p>
      </div>
    );
  }

  const checklist = await getSellerOnboardingChecklist(seller.sellerProfileId);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          Старт продавца
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Пять шагов, которые помогут сделать первую продажу. Обучение встроено
          в ваш сценарий — без отдельной справочной системы.
        </p>
      </div>
      {checklist ? <SellerOnboardingPanel checklist={checklist} /> : null}
    </div>
  );
}
