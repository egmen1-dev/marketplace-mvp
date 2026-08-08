import { redirect } from "next/navigation";

import { AccountShell } from "@/features/account";
import { getSessionUser, loadUserAuthFromDb } from "@/features/auth";
import { ReservationsList } from "@/features/pickup";
import {
  listBuyerReservations,
  listSellerReservations,
} from "@/features/pickup/queries";
import { ROUTES } from "@/lib/constants";

export const dynamic = "force-dynamic";

export const metadata = { title: "Бронирования" };

export default async function ReservationsPage() {
  const user = await getSessionUser();
  if (!user) {
    redirect(
      `${ROUTES.AUTH_SIGN_IN}?callbackUrl=${encodeURIComponent(ROUTES.ACCOUNT_RESERVATIONS)}`,
    );
  }

  const dbUser = await loadUserAuthFromDb(user.id);
  const isSeller = Boolean(
    dbUser?.sellerProfileId &&
      (dbUser.role === "SELLER" || dbUser.role === "ADMIN"),
  );

  const [buyerList, sellerList] = await Promise.all([
    listBuyerReservations(user.id),
    isSeller && dbUser?.sellerProfileId
      ? listSellerReservations(dbUser.sellerProfileId)
      : Promise.resolve([]),
  ]);

  return (
    <AccountShell
      title="Бронирования"
      description="Самовывоз с предоплатой — заявки покупателя и продавца."
    >
      <div className="space-y-8">
        <section className="space-y-3">
          <h2 className="font-heading text-base font-semibold">Мои брони</h2>
          <ReservationsList reservations={buyerList} mode="buyer" />
        </section>
        {isSeller ? (
          <section className="space-y-3">
            <h2 className="font-heading text-base font-semibold">
              Заявки на самовывоз
            </h2>
            <ReservationsList reservations={sellerList} mode="seller" />
          </section>
        ) : null}
      </div>
    </AccountShell>
  );
}
