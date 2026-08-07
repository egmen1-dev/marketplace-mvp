import Link from "next/link";
import { Home, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ROUTES } from "@/lib/constants";

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-lg flex-col items-center gap-6 px-4 py-20 text-center sm:px-6 sm:py-28">
      <p className="font-heading text-6xl font-semibold tracking-tight text-primary">
        404
      </p>
      <div className="space-y-2">
        <h1 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">
          Страница не найдена
        </h1>
        <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
          Ссылка устарела или страница была удалена. Вернитесь на главную или
          откройте каталог.
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Button
          size="lg"
          nativeButton={false}
          render={<Link href={ROUTES.HOME} />}
        >
          <Home data-icon="inline-start" />
          На главную
        </Button>
        <Button
          variant="outline"
          size="lg"
          nativeButton={false}
          render={<Link href={ROUTES.CATALOG} />}
        >
          <Search data-icon="inline-start" />
          В каталог
        </Button>
      </div>
    </div>
  );
}
