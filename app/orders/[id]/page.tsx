import { notFound, redirect } from "next/navigation";

import { getSessionUser } from "@/features/auth";
import { getOrderForUser, OrderDetailView } from "@/features/orders";
import { ROUTES } from "@/lib/constants";

export const dynamic = "force-dynamic";

type OrderPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ payment?: string }>;
};

export const metadata = {
  title: "Заказ",
};

export default async function OrderDetailPage({
  params,
  searchParams,
}: OrderPageProps) {
  const { id } = await params;
  const { payment } = await searchParams;
  const user = await getSessionUser();
  if (!user) {
    redirect(
      `${ROUTES.AUTH_SIGN_IN}?callbackUrl=${encodeURIComponent(`${ROUTES.ORDERS}/${id}`)}`,
    );
  }

  const order = await getOrderForUser(user.id, id);
  if (!order) {
    notFound();
  }

  return (
    <OrderDetailView
      order={order}
      paymentSuccess={payment === "success"}
    />
  );
}
