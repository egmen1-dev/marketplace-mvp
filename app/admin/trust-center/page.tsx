import { AdminTrustCenterPanel } from "@/features/trust-safety";
import {
  getAdminTrustCenterDashboard,
  isTrustSafetyEnabled,
} from "@/lib/trust-safety";

export const metadata = {
  title: "Trust Center",
};

export default async function AdminTrustCenterPage() {
  const data = isTrustSafetyEnabled()
    ? await getAdminTrustCenterDashboard()
    : {
        enabled: false,
        marketplaceHealth: [],
        sellerRisks: [],
        productsWithoutTrust: [],
        disputeOverview: [],
      };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="font-heading text-2xl font-semibold tracking-tight">
          Trust Center
        </h2>
        <p className="text-sm text-muted-foreground">
          Marketplace trust health, seller risks, weak cards, disputes — advisory
          only, без автоблокировок.
        </p>
      </div>
      <AdminTrustCenterPanel data={data} />
    </div>
  );
}
