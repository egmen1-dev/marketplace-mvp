import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { PublicCollectionView } from "@/features/marketplace-social-growth";
import {
  isSocialCollectionsEnabled,
  loadPublicCollection,
  getPublicCollectionMeta,
} from "@/lib/marketplace-social-growth";
import { APP_NAME } from "@/lib/constants";

type PublicCollectionPageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({
  params,
}: PublicCollectionPageProps): Promise<Metadata> {
  const { slug } = await params;
  const collection = await getPublicCollectionMeta(slug);
  if (!collection || !isSocialCollectionsEnabled()) {
    return { title: "Подборка не найдена" };
  }
  return {
    title: `${collection.title} · ${APP_NAME}`,
    description:
      collection.description ?? `${collection._count.items} товаров в подборке`,
  };
}

export default async function PublicSocialCollectionPage({
  params,
}: PublicCollectionPageProps) {
  const { slug } = await params;

  if (!isSocialCollectionsEnabled()) notFound();

  const collection = await loadPublicCollection(slug);
  if (!collection) notFound();

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10">
      <PublicCollectionView collection={collection} />
    </div>
  );
}
