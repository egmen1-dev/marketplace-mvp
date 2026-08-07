import { Suspense } from "react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { SignUpForm } from "@/features/auth";

export const metadata = {
  title: "Регистрация",
  description: "Создайте аккаунт покупателя или продавца на маркетплейсе Лот.",
};

export default function SignUpPage() {
  return (
    <div className="mx-auto flex max-w-md flex-col gap-6 px-4 py-8 sm:px-6 sm:py-12">
      <div className="flex flex-col gap-2">
        <h1 className="font-heading text-3xl font-semibold tracking-tight">
          Регистрация
        </h1>
        <p className="text-sm text-muted-foreground">
          Создайте аккаунт покупателя или сразу откройте магазин продавца.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Новый аккаунт</CardTitle>
          <CardDescription>
            Выберите тип аккаунта. Профиль продавца создаётся только при
            регистрации как продавец.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Suspense
            fallback={
              <p className="text-sm text-muted-foreground">Загрузка…</p>
            }
          >
            <SignUpForm />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  );
}
