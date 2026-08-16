import { NextResponse } from "next/server";

import { resolveRequestUser } from "@/features/auth/resolve-request-user";
import { listOrdersForUser } from "@/features/orders";

/** GET /api/orders — current user's orders. */
export async function GET(request: Request) {
  try {
    const user = await resolveRequestUser(request);
    if (!user) {
      return NextResponse.json({ error: "Требуется вход" }, { status: 401 });
    }

    const orders = await listOrdersForUser(user.id);
    return NextResponse.json({ items: orders });
  } catch (err) {
    console.error("[GET /api/orders]", err);
    return NextResponse.json(
      { error: "Не удалось загрузить заказы" },
      { status: 500 },
    );
  }
}
