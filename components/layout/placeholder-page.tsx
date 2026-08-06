import Link from "next/link";

import { Button } from "@/components/ui/button";
import { ROUTES } from "@/lib/constants";

type PlaceholderPageProps = {
  title: string;
  description: string;
  primaryHref?: string;
  primaryLabel?: string;
};

export function PlaceholderPage({
  title,
  description,
  primaryHref = ROUTES.CATALOG,
  primaryLabel = "Смотреть каталог",
}: PlaceholderPageProps) {
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-16 sm:px-6 sm:py-24">
      <div className="space-y-3">
        <h1 className="font-heading text-3xl font-semibold tracking-tight sm:text-4xl">
          {title}
        </h1>
        <p className="text-base leading-relaxed text-muted-foreground">
          {description}
        </p>
      </div>
      <div className="flex flex-wrap gap-3">
        <Button
          size="lg"
          nativeButton={false}
          render={<Link href={primaryHref} />}
        >
          {primaryLabel}
        </Button>
        <Button
          variant="outline"
          size="lg"
          nativeButton={false}
          render={<Link href={ROUTES.HOME} />}
        >
          На главную
        </Button>
      </div>
    </div>
  );
}
