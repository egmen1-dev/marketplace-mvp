"use client";

import { useEffect } from "react";

import { Button } from "@/components/ui/button";
import { ROUTES } from "@/lib/constants";

type GlobalErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    console.error("[global-error]", error.digest ?? error.message);
  }, [error]);

  return (
    <html lang="ru">
      <body className="flex min-h-screen flex-col items-center justify-center bg-white px-4 text-center text-[#111] antialiased">
        <h1 className="text-xl font-semibold">Произошла ошибка. Обновите страницу</h1>
        <p className="mt-2 max-w-md text-sm text-neutral-600">
          Если ошибка повторяется, вернитесь на главную.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Button type="button" onClick={() => reset()}>
            Обновить
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              window.location.href = ROUTES.HOME;
            }}
          >
            На главную
          </Button>
        </div>
      </body>
    </html>
  );
}
