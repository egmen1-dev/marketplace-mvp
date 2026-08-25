import { notFound } from "next/navigation";

import { AdminModerationDetailPanel } from "@/features/marketplace-trust-loop/components/admin-moderation-detail-panel";
import { getAdminModerationProductDetail } from "@/lib/moderation/admin-detail";

export const dynamic = "force-dynamic";

export const metadata = { title: "Админ · Модерация ЛОТа" };

export default async function AdminModerationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const detail = await getAdminModerationProductDetail(id);
  if (!detail) notFound();

  return <AdminModerationDetailPanel product={detail.product} sellerStats={detail.sellerStats} />;
}
