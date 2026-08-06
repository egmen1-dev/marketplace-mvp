import { NextResponse } from "next/server";

import { getSessionUser } from "@/features/auth";
import { listOrdersForUser } from "@/features/orders";

/** GET /api/orders — current user's orders. */
export async function GET() {
  try {
    const user = await getSessionUser();
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
