"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ROUTES } from "@/lib/constants";

type ErrorPageProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    console.error("[app-error]", error.digest ?? error.message);
  }, [error]);

  return (
    <div className="mx-auto flex max-w-lg flex-col items-center gap-6 px-4 py-20 text-center sm:px-6 sm:py-28">
      <div className="flex size-14 items-center justify-center rounded-2xl bg-destructive/15 text-destructive">
        <AlertTriangle className="size-7" aria-hidden />
      </div>
      <div className="space-y-2">
        <h1 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">
          Что-то пошло не так
        </h1>
        <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
          Не удалось загрузить страницу. Попробуйте ещё раз или вернитесь на
          главную.
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Button size="lg" onClick={reset}>
          Повторить
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
