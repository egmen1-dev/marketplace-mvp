import { NextResponse } from "next/server";

import {
  DeliveryError,
  getDeliveryProvider,
} from "@/lib/delivery";

/**
 * GET /api/delivery/points?city=Москва
 * Returns CDEK pickup points (ПВЗ) for the city (mock or real).
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const city = searchParams.get("city")?.trim() ?? "";

    if (city.length < 2) {
      return NextResponse.json(
        { error: "Укажите город (параметр city)" },
        { status: 400 },
      );
    }

    const provider = getDeliveryProvider();
    const points = await provider.listPickupPoints(city);

    return NextResponse.json({
      city,
      source: provider.name,
      points,
    });
  } catch (err) {
    if (err instanceof DeliveryError) {
      return NextResponse.json(
        { error: err.message },
        { status: err.status },
      );
    }
    console.error("[GET /api/delivery/points]", err);
    return NextResponse.json(
      { error: "Не удалось загрузить пункты выдачи" },
      { status: 500 },
    );
  }
}
