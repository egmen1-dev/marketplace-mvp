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
};

export default function SignUpPage() {
  return (
    <div className="mx-auto flex max-w-md flex-col gap-6 px-4 py-8 sm:px-6 sm:py-12">
      <div className="flex flex-col gap-2">
        <h1 className="font-heading text-3xl font-semibold tracking-tight">
          Регистрация
        </h1>
        <p className="text-sm text-muted-foreground">
          Создайте аккаунт — сразу можно покупать и выставлять товары.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Новый аккаунт</CardTitle>
          <CardDescription>
            Профиль продавца создаётся автоматически для всех пользователей.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SignUpForm />
        </CardContent>
      </Card>
    </div>
  );
}
