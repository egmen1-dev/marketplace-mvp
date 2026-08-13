import { requireAdminSession } from "@/features/auth";
import { AdminDisputesPanel } from "@/features/trust/components/admin-disputes-panel";
import { listAdminDisputes } from "@/lib/trust";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Споры",
};

type PageProps = {
  searchParams: Promise<{ status?: string }>;
};

export default async function AdminDisputesPage({ searchParams }: PageProps) {
  await requireAdminSession();
  const params = await searchParams;
  const raw = params.status?.toUpperCase() ?? "ALL";
  const filter =
    raw === "OPEN" ||
    raw === "UNDER_REVIEW" ||
    raw === "RESOLVED" ||
    raw === "ALL"
      ? raw
      : "ALL";

  const rows = await listAdminDisputes({
    status: filter === "ALL" ? undefined : filter,
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          Споры
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Разрешение споров покупателей — выплата продавцу или возврат средств.
        </p>
      </div>
      <AdminDisputesPanel rows={rows} filter={filter} />
    </div>
  );
}
