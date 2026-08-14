import Link from "next/link";

import {
  getAdminTrustCenter,
  isMarketplaceTrustExperienceEnabled,
} from "@/lib/marketplace-trust-experience";
import { AdminTrustCenterPanel } from "@/features/marketplace-trust-experience";
import { AdminTrustDashboard } from "@/features/marketplace-trust-loop";
import { getAdminTrustHealth, isMarketplaceTrustLoopEnabled } from "@/lib/marketplace-trust-loop";
import { ROUTES } from "@/lib/constants";

export const metadata = { title: "Trust Center" };

export const dynamic = "force-dynamic";

export default async function AdminTrustCenterPage() {
  const experienceEnabled = isMarketplaceTrustExperienceEnabled();
  const trustLoopEnabled = isMarketplaceTrustLoopEnabled();

  const [center, health] = await Promise.all([
    experienceEnabled ? getAdminTrustCenter() : Promise.resolve(null),
    trustLoopEnabled ? getAdminTrustHealth() : Promise.resolve(null),
  ]);

  return (
    <div className="flex flex-col gap-6" data-testid="admin-trust-center-page">
      <div>
        <h2 className="font-heading text-2xl font-semibold tracking-tight">Trust Center</h2>
        <p className="text-sm text-muted-foreground">
          Аналитика доверия продавцов и здоровье репутации площадки
        </p>
        {!experienceEnabled ? (
          <p className="mt-2 text-xs text-muted-foreground">
            MARKETPLACE_TRUST_EXPERIENCE_ENABLED=false
          </p>
        ) : null}
      </div>

      {center?.enabled ? <AdminTrustCenterPanel snapshot={center} /> : null}

      {health?.enabled ? (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-muted-foreground">
            Базовый trust health из trust loop —{" "}
            <Link href={ROUTES.ADMIN_TRUST} className="text-primary underline-offset-4 hover:underline">
              /admin/trust
            </Link>
          </p>
          <AdminTrustDashboard health={health} />
        </div>
      ) : null}

      {!center?.enabled && !health?.enabled ? (
        <p className="text-sm text-muted-foreground">
          Включите MARKETPLACE_TRUST_EXPERIENCE_ENABLED и MARKETPLACE_TRUST_SCORE_MODEL_ENABLED
        </p>
      ) : null}
    </div>
  );
}
