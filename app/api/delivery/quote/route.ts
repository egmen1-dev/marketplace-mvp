import { NextResponse } from "next/server";
import { z } from "zod";

import {
  DeliveryError,
  formatDeliveryEta,
  getDeliveryProvider,
} from "@/lib/delivery";

const quoteBodySchema = z.object({
  method: z.enum(["PICKUP", "COURIER"]),
  city: z.string().trim().min(2).max(80),
  pickupPointCode: z.string().trim().max(64).optional(),
  weightGrams: z.number().int().positive().max(100_000).optional(),
  lengthCm: z.number().finite().min(1).max(500).optional(),
  widthCm: z.number().finite().min(1).max(500).optional(),
  heightCm: z.number().finite().min(1).max(500).optional(),
});

/**
 * POST /api/delivery/quote
 * Body: { method, city, pickupPointCode?, weightGrams? }
 */
export async function POST(request: Request) {
  try {
    const json: unknown = await request.json();
    const parsed = quoteBodySchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Некорректные параметры расчёта" },
        { status: 400 },
      );
    }

    const provider = getDeliveryProvider();
    const quote = await provider.getQuote(parsed.data);

    return NextResponse.json({
      quote,
      etaLabel: formatDeliveryEta(
        quote.estimatedMinDays,
        quote.estimatedMaxDays,
      ),
      source: provider.name,
    });
  } catch (err) {
    if (err instanceof DeliveryError) {
      return NextResponse.json(
        { error: err.message },
        { status: err.status },
      );
    }
    console.error("[POST /api/delivery/quote]", err);
    return NextResponse.json(
      { error: "Не удалось рассчитать доставку" },
      { status: 500 },
    );
  }
}
