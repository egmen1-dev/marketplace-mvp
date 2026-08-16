import Link from "next/link";
import { notFound } from "next/navigation";

import { Button } from "@/components/ui/button";
import { AdminCognitiveProductPanel } from "@/features/marketplace-cognitive-platform";
import { ROUTES } from "@/lib/constants";
import {
  getMarketplaceBrainReport,
  isCognitiveProductReportAvailable,
} from "@/lib/marketplace-cognitive-platform";

export const dynamic = "force-dynamic";

type AdminCognitiveProductPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    query?: string;
    compareQuery?: string;
    device?: "mobile" | "desktop" | "tablet";
  }>;
};

export default async function AdminCognitiveProductPage({
  params,
  searchParams,
}: AdminCognitiveProductPageProps) {
  const { id } = await params;
  const { query, compareQuery, device } = await searchParams;

  if (!isCognitiveProductReportAvailable()) {
    return (
      <p className="text-sm text-muted-foreground">
        CCOS / Marketplace Cognitive Platform выключены. Установите CCOS_ENABLED=true и
        MARKETPLACE_COGNITIVE_PLATFORM_ENABLED=true.
      </p>
    );
  }

  const [report, compareReport] = await Promise.all([
    getMarketplaceBrainReport(id, { query, device }),
    compareQuery
      ? getMarketplaceBrainReport(id, { query: compareQuery, device })
      : Promise.resolve(null),
  ]);
  if (!report) notFound();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Button
          variant="ghost"
          size="sm"
          className="mb-2 text-muted-foreground"
          nativeButton={false}
          render={<Link href={ROUTES.ADMIN_PRODUCTS} />}
        >
          ← Products
        </Button>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          Cognitive Debug (Wave 1)
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">Product {id}</p>
        <p className="mt-2 text-xs text-muted-foreground">
          Debug: добавьте ?query=тихий+вентилятор&compareQuery=вентилятор&device=mobile
        </p>
      </div>
      <AdminCognitiveProductPanel report={report} compareReport={compareReport} />
    </div>
  );
}
