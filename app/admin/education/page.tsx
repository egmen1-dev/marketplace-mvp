import { AdminMarketplaceEducationPanel } from "@/features/admin/components/admin-marketplace-education-panel";
import { getMarketplaceEducationDashboard } from "@/lib/marketplace-education";

export const metadata = {
  title: "Marketplace Education",
};

export default async function AdminEducationPage() {
  const data = await getMarketplaceEducationDashboard();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="font-heading text-2xl font-semibold tracking-tight">
          Marketplace Guidance & Education
        </h2>
        <p className="text-sm text-muted-foreground">
          Контент-менеджер guides, tooltips и onboarding steps. Только UX-слой —
          без изменения catalog, search, orders и finance logic.
        </p>
      </div>
      <AdminMarketplaceEducationPanel data={data} />
    </div>
  );
}
