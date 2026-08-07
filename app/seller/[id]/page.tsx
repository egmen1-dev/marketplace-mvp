import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { SellerProductsSection } from "@/features/seller/components/seller-products-section";
import { SellerPublicHeader } from "@/features/seller/components/seller-public-header";
import { getPublicSellerPageData } from "@/features/seller/queries";
import { APP_NAME } from "@/lib/constants";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const data = await getPublicSellerPageData(id);
  if (!data) return { title: "Продавец" };
  return {
    title: `${data.trust.storeName} · ${APP_NAME}`,
    description: data.trust.description ?? undefined,
  };
}

export default async function PublicSellerPage({ params }: PageProps) {
  const { id } = await params;
  const data = await getPublicSellerPageData(id);
  if (!data) notFound();

  const { trust, products } = data;

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-10 px-4 py-10 sm:px-6">
      <SellerPublicHeader profile={trust} />
      <SellerProductsSection products={products} />
    </div>
  );
}
