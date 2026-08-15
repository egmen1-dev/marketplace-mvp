import { AdminFinancialIncidentsPanel } from "@/features/admin/components/admin-financial-incidents-panel";
import { requireAdminSession } from "@/features/auth";
import {
  countOpenIncidentsBySeverity,
  listFinancialIncidents,
} from "@/lib/financial-transaction-engine";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Admin — Financial Incidents",
};

export default async function AdminFinancialIncidentsPage() {
  await requireAdminSession();

  const [incidents, counts] = await Promise.all([
    listFinancialIncidents(200),
    countOpenIncidentsBySeverity(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          Financial Incident Center
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          CRITICAL / HIGH / MEDIUM / LOW — расхождения ledger, verification
          failures, reconciliation drift.
        </p>
      </div>
      <AdminFinancialIncidentsPanel incidents={incidents} counts={counts} />
    </div>
  );
}
