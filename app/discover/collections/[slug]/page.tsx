import { notFound } from "next/navigation";
import type { Metadata } from "next";

import {
  DiscoveryCollectionTracker,
  DiscoveryCollectionView,
} from "@/features/marketplace-discovery";
import {
  getDiscoveryCollection,
  isDiscoveryCollectionsEnabled,
  loadDiscoveryCollectionPage,
} from "@/lib/marketplace-discovery";
import { APP_NAME } from "@/lib/constants";

type CollectionPageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({
  params,
}: CollectionPageProps): Promise<Metadata> {
  const { slug } = await params;
  const collection = getDiscoveryCollection(slug);
  if (!collection || !isDiscoveryCollectionsEnabled()) {
    return { title: "Подборка не найдена" };
  }
  return {
    title: collection.seoTitle,
    description: collection.seoDescription,
    openGraph: {
      title: `${collection.seoTitle} · ${APP_NAME}`,
      description: collection.seoDescription,
    },
  };
}

export default async function DiscoveryCollectionPage({
  params,
}: CollectionPageProps) {
  const { slug } = await params;

  if (!isDiscoveryCollectionsEnabled()) notFound();

  const page = await loadDiscoveryCollectionPage(slug);
  if (!page) notFound();

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10">
      <DiscoveryCollectionTracker slug={slug} />
      <DiscoveryCollectionView page={page} />
    </div>
  );
}
