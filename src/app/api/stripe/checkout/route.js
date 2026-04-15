import { NextResponse } from "next/server";
import Stripe from "stripe";

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) return null;
  return new Stripe(key);
}

function getAppUrl(request) {
  return (
    process.env.APP_URL?.trim() ||
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    request.headers.get("origin") ||
    "http://localhost:3100"
  );
}

function isPriceId(s) {
  return /^price_[a-zA-Z0-9]+$/.test(String(s || ""));
}

/**
 * POST /api/stripe/checkout
 * Body: { priceId: string, mode?: "payment"|"subscription", planId?: string }
 *
 * Returns: { url: string }
 */
export async function POST(request) {
  const stripe = getStripe();
  if (!stripe) {
    return NextResponse.json({ error: "stripe_not_configured" }, { status: 503 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const priceId = String(body?.priceId ?? "").trim();
  const mode = body?.mode === "subscription" ? "subscription" : "payment";
  const planId = String(body?.planId ?? "").trim();

  if (!isPriceId(priceId)) {
    return NextResponse.json({ error: "invalid_price_id" }, { status: 400 });
  }

  const appUrl = getAppUrl(request);

  let session;
  try {
    session = await stripe.checkout.sessions.create({
      mode,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${appUrl}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/billing/cancel`,
      metadata: planId ? { planId } : undefined,
    });
  } catch (e) {
    const status = Number(e?.statusCode) || 502;
    return NextResponse.json(
      {
        error: "stripe_error",
        stripeMessage: String(e?.message || ""),
        stripeType: String(e?.type || ""),
        stripeCode: String(e?.code || ""),
      },
      { status }
    );
  }

  return NextResponse.json({ url: session.url });
}

