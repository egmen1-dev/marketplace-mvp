import { NextResponse } from "next/server";

import { resolveRequestUser } from "@/features/auth/resolve-request-user";
import { getOrderForUser } from "@/features/orders";

type RouteContext = {
  params: Promise<{ id: string }>;
};

/** GET /api/orders/[id] — order detail (owner only). */
export async function GET(request: Request, context: RouteContext) {
  try {
    const user = await resolveRequestUser(request);
    if (!user) {
      return NextResponse.json({ error: "Требуется вход" }, { status: 401 });
    }

    const { id } = await context.params;
    const order = await getOrderForUser(user.id, id);
    if (!order) {
      return NextResponse.json({ error: "Заказ не найден" }, { status: 404 });
    }

    return NextResponse.json(order);
  } catch (err) {
    console.error("[GET /api/orders/[id]]", err);
    return NextResponse.json(
      { error: "Не удалось загрузить заказ" },
      { status: 500 },
    );
  }
}
