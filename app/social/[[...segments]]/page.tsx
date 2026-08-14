import { notFound } from "next/navigation";
import type { Metadata } from "next";

import {
  SocialExternalVisitTracker,
  SocialLandingSection,
} from "@/features/marketplace-social-growth";
import {
  getSocialLandingPage,
  isSocialCollectionsEnabled,
  loadSocialLandingView,
} from "@/lib/marketplace-social-growth";
import { APP_NAME } from "@/lib/constants";

type SocialLandingPageProps = {
  params: Promise<{ segments?: string[] }>;
};

export async function generateMetadata({
  params,
}: SocialLandingPageProps): Promise<Metadata> {
  const { segments = [] } = await params;
  const path = segments.join("/");
  const page = getSocialLandingPage(path);
  if (!page || !isSocialCollectionsEnabled()) {
    return { title: "Страница не найдена" };
  }
  return {
    title: page.seoTitle,
    description: page.seoDescription,
    openGraph: {
      title: `${page.seoTitle} · ${APP_NAME}`,
      description: page.seoDescription,
    },
  };
}

export default async function SocialLandingPage({ params }: SocialLandingPageProps) {
  const { segments = [] } = await params;
  const path = segments.join("/");

  if (!isSocialCollectionsEnabled()) notFound();

  const view = await loadSocialLandingView(path);
  if (!view) notFound();

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10">
      <SocialExternalVisitTracker source={path} />
      <SocialLandingSection view={view} />
    </div>
  );
}
