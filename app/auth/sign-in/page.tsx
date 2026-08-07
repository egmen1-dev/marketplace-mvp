import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { SignInForm } from "@/features/auth";
import { ROUTES } from "@/lib/constants";

export const metadata = {
  title: "Вход",
};

type SignInPageProps = {
  searchParams: Promise<{ callbackUrl?: string }>;
};

export default async function SignInPage({ searchParams }: SignInPageProps) {
  const params = await searchParams;
  const callbackUrl =
    params.callbackUrl?.startsWith("/") &&
    !params.callbackUrl.startsWith("//")
      ? params.callbackUrl
      : ROUTES.HOME;

  return (
    <div className="mx-auto flex max-w-md flex-col gap-6 px-4 py-8 sm:px-6 sm:py-12">
      <div className="flex flex-col gap-2">
        <h1 className="font-heading text-3xl font-semibold tracking-tight">
          Вход
        </h1>
        <p className="text-sm text-muted-foreground">
          Войдите, чтобы покупать и управлять объявлениями.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Авторизация</CardTitle>
          <CardDescription>
            Введите email и пароль аккаунта.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SignInForm callbackUrl={callbackUrl} />
        </CardContent>
      </Card>
    </div>
  );
}
