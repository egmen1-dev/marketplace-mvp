import Link from "next/link";
import { redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import { getSessionUser } from "@/features/auth";
import { getCartForUser } from "@/features/cart";
import { CheckoutForm } from "@/features/orders";
import { ROUTES } from "@/lib/constants";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Оформление заказа",
};

type CheckoutPageProps = {
  searchParams: Promise<{ canceled?: string }>;
};

export default async function CheckoutPage({
  searchParams,
}: CheckoutPageProps) {
  const { canceled } = await searchParams;
  const user = await getSessionUser();
  if (!user) {
    redirect(
      `${ROUTES.AUTH_SIGN_IN}?callbackUrl=${encodeURIComponent(ROUTES.CHECKOUT)}`,
    );
  }

  const [cart, profile] = await Promise.all([
    getCartForUser(user.id),
    prisma.user.findUnique({
      where: { id: user.id },
      select: { phone: true, name: true },
    }),
  ]);

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-8 sm:px-6 sm:py-12">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">
            Оформление заказа
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Проверьте товары и укажите данные для доставки.
          </p>
        </div>
        {cart.items.length > 0 ? (
          <Button
            variant="outline"
            size="sm"
            nativeButton={false}
            render={<Link href={ROUTES.CART} />}
          >
            Изменить корзину
          </Button>
        ) : null}
      </div>

      <CheckoutForm
        initialCart={cart}
        defaultName={profile?.name ?? user.name ?? ""}
        defaultPhone={profile?.phone ?? ""}
        canceled={canceled === "1"}
      />
    </div>
  );
}
