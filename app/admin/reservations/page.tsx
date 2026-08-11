import { ReservationsList } from "@/features/pickup";
import { listAllReservationsForAdmin } from "@/features/pickup/queries";

export const metadata = {
  title: "Бронирования · Admin",
};

export const dynamic = "force-dynamic";

export default async function AdminReservationsPage() {
  const reservations = await listAllReservationsForAdmin(80);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="font-heading text-2xl font-semibold tracking-tight">
          Бронирования
        </h2>
        <p className="text-sm text-muted-foreground">
          Все заявки на самовывоз с предоплатой (модерация).
        </p>
      </div>
      <ReservationsList reservations={reservations} mode="admin" />
    </div>
  );
}
