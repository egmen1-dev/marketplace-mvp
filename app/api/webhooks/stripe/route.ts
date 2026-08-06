import { NextResponse } from "next/server";

import { handleStripeWebhook } from "@/features/payments";
import { isStripeConfigured } from "@/lib/stripe";

/**
 * POST /api/webhooks/stripe
 * Raw body required for Stripe signature verification.
 */
export async function POST(request: Request) {
  if (!isStripeConfigured()) {
    return NextResponse.json(
      { error: "Stripe is not configured" },
      { status: 503 },
    );
  }

  const signature = request.headers.get("stripe-signature");
  const rawBody = await request.text();

  try {
    const result = await handleStripeWebhook(rawBody, signature);
    return NextResponse.json({
      received: true,
      handled: result.handled,
      type: result.type,
      orderId: result.orderId ?? undefined,
      alreadyPaid: result.alreadyPaid ?? undefined,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Webhook error";
    const isSig =
      message.includes("signature") || message.includes("Stripe-Signature");
    console.error("[stripe webhook]", message);
    return NextResponse.json(
      { error: message },
      { status: isSig ? 400 : 500 },
    );
  }
}
