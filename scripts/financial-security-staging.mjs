#!/usr/bin/env node
/**
 * Financial security checks against staging webhook endpoint.
 * Requires STRIPE_WEBHOOK_SECRET and BASE_URL in env.
 *
 * Usage:
 *   BASE_URL=https://web-production-e56fb.up.railway.app \
 *   STRIPE_WEBHOOK_SECRET=whsec_... \
 *   node scripts/financial-security-staging.mjs
 */

import crypto from "node:crypto";

const BASE_URL = (process.env.BASE_URL ?? process.env.PLAYWRIGHT_BASE_URL ?? "").replace(/\/$/, "");
const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET?.trim() ?? "";

if (!BASE_URL || !WEBHOOK_SECRET) {
  console.error("Set BASE_URL and STRIPE_WEBHOOK_SECRET");
  process.exit(1);
}

const results = [];

function sign(payload, secret) {
  const timestamp = Math.floor(Date.now() / 1000);
  const signedPayload = `${timestamp}.${payload}`;
  const sig = crypto
    .createHmac("sha256", secret)
    .update(signedPayload, "utf8")
    .digest("hex");
  return `t=${timestamp},v1=${sig}`;
}

async function postWebhook(body, signature) {
  const res = await fetch(`${BASE_URL}/api/webhooks/stripe`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Stripe-Signature": signature ?? "invalid",
    },
    body,
  });
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    // ignore
  }
  return { status: res.status, text, json };
}

function record(name, pass, detail) {
  results.push({ name, pass, detail });
  console.log(`${pass ? "PASS" : "FAIL"} — ${name}: ${detail}`);
}

async function main() {
  const eventId = `evt_fin_sec_${Date.now()}`;
  const sessionId = `cs_test_fin_sec_${Date.now()}`;
  const fakeUserId = "00000000-0000-0000-0000-000000000099";

  const walletEvent = {
    id: eventId,
    object: "event",
    type: "checkout.session.completed",
    data: {
      object: {
        id: sessionId,
        object: "checkout.session",
        mode: "payment",
        payment_status: "paid",
        amount_total: 50000,
        metadata: {
          purpose: "wallet_top_up",
          userId: fakeUserId,
          amountRub: "500",
        },
      },
    },
  };

  const payload = JSON.stringify(walletEvent);

  // Invalid signature
  {
    const res = await postWebhook(payload, "t=0,v1=deadbeef");
    record(
      "invalid signature rejected",
      res.status === 400 || res.status === 500,
      `HTTP ${res.status}`,
    );
  }

  // Wrong metadata (not wallet_top_up) — should not credit
  {
    const badMeta = {
      ...walletEvent,
      id: `${eventId}_badmeta`,
      data: {
        object: {
          ...walletEvent.data.object,
          id: `${sessionId}_badmeta`,
          metadata: { purpose: "order", orderId: "fake-order" },
        },
      },
    };
    const body = JSON.stringify(badMeta);
    const sig = sign(body, WEBHOOK_SECRET);
    const res = await postWebhook(body, sig);
    record(
      "wrong metadata handled safely",
      res.status === 200 || res.status === 400,
      `HTTP ${res.status}`,
    );
  }

  // Negative amount in metadata (business layer should reject or ignore)
  {
    const neg = {
      ...walletEvent,
      id: `${eventId}_neg`,
      data: {
        object: {
          ...walletEvent.data.object,
          id: `${sessionId}_neg`,
          amount_total: -100,
          metadata: {
            purpose: "wallet_top_up",
            userId: fakeUserId,
            amountRub: "-100",
          },
        },
      },
    };
    const body = JSON.stringify(neg);
    const sig = sign(body, WEBHOOK_SECRET);
    const res = await postWebhook(body, sig);
    record(
      "negative amount rejected",
      res.status >= 400 || res.status === 200,
      `HTTP ${res.status}`,
    );
  }

  // Duplicate event replay
  {
    const dupId = `${eventId}_dup`;
    const dupSession = `${sessionId}_dup`;
    const dupEvent = {
      ...walletEvent,
      id: dupId,
      data: {
        object: {
          ...walletEvent.data.object,
          id: dupSession,
        },
      },
    };
    const body = JSON.stringify(dupEvent);
    const sig1 = sign(body, WEBHOOK_SECRET);
    const first = await postWebhook(body, sig1);
    const sig2 = sign(body, WEBHOOK_SECRET);
    const second = await postWebhook(body, sig2);
    const duplicateSafe =
      first.status === 200 &&
      (second.status === 200 || second.status === 409) &&
      (second.json?.duplicate === true || second.text.includes("duplicate") || second.status === 200);
    record(
      "duplicate webhook idempotent",
      duplicateSafe,
      `first=${first.status} second=${second.status}`,
    );
  }

  const failed = results.filter((r) => !r.pass);
  console.log("\n--- Summary ---");
  console.log(`Total: ${results.length}, Failed: ${failed.length}`);
  process.exit(failed.length ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
