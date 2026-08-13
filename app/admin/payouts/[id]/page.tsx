import { notFound } from "next/navigation";

import { requireAdminSession } from "@/features/auth";
import { AdminPayoutDetailPanel } from "@/features/seller-payout";
import { getAdminPayoutRequestDetail } from "@/lib/seller-payout";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function AdminPayoutDetailPage({ params }: PageProps) {
  await requireAdminSession();
  const { id } = await params;
  const detail = await getAdminPayoutRequestDetail(id);
  if (!detail) notFound();

  return <AdminPayoutDetailPanel detail={detail} />;
}
