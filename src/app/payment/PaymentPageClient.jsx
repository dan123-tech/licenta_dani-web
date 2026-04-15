"use client";

import React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowRight, Loader2, ShieldCheck } from "lucide-react";

function getStripePriceId(planId) {
  if (planId === "starter") return process.env.NEXT_PUBLIC_STRIPE_PRICE_STARTER || "";
  if (planId === "starter_plus") return process.env.NEXT_PUBLIC_STRIPE_PRICE_STARTER_PLUS || "";
  if (planId === "premium") return process.env.NEXT_PUBLIC_STRIPE_PRICE_PREMIUM || "";
  if (planId === "corporate") return process.env.NEXT_PUBLIC_STRIPE_PRICE_CORPORATE || "";
  return "";
}

export default function PaymentPageClient() {
  const sp = useSearchParams();
  const planId = String(sp.get("plan") || "").trim();
  const [status, setStatus] = React.useState("idle"); // idle | starting | error
  const [error, setError] = React.useState("");
  const [details, setDetails] = React.useState("");

  React.useEffect(() => {
    let alive = true;

    async function go() {
      if (!planId || planId === "free" || planId === "enterprise") {
        if (!alive) return;
        setStatus("error");
        setError("This plan can’t be purchased online.");
        return;
      }

      const priceId = getStripePriceId(planId);
      if (!priceId) {
        if (!alive) return;
        setStatus("error");
        setError("Stripe is not configured for this plan yet (missing Price ID).");
        setDetails(`Missing env var for plan: ${planId}`);
        return;
      }

      if (!alive) return;
      setStatus("starting");
      setError("");

      try {
        const res = await fetch("/api/stripe/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ priceId, mode: "payment", planId }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data?.url) {
          const stripeMsg = data?.stripeMessage ? ` — ${data.stripeMessage}` : "";
          const code = data?.stripeCode ? ` (${data.stripeCode})` : "";
          throw new Error(`${data?.error || "checkout_failed"}${code}${stripeMsg}`);
        }
        window.location.href = data.url;
      } catch (e) {
        if (!alive) return;
        setStatus("error");
        setError("Could not start checkout. Please try again.");
        setDetails(String(e?.message || ""));
      }
    }

    go();
    return () => {
      alive = false;
    };
  }, [planId]);

  return (
    <main className="min-h-[70vh] flex items-center justify-center px-4">
      <div className="max-w-lg w-full rounded-2xl border p-6" style={{ borderColor: "rgba(255,255,255,0.12)" }}>
        <div className="flex items-center gap-3 mb-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: "rgba(24,95,165,0.2)", border: "1px solid rgba(24,95,165,0.35)" }}
          >
            <ShieldCheck className="w-5 h-5" style={{ color: "#93c5fd" }} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Secure checkout</h1>
            <p className="text-xs" style={{ color: "rgba(255,255,255,0.55)" }}>
              You’ll be redirected to Stripe to complete payment.
            </p>
          </div>
        </div>

        {status === "starting" ? (
          <div className="flex items-center gap-2 text-sm" style={{ color: "rgba(255,255,255,0.75)" }}>
            <Loader2 className="w-4 h-4 animate-spin" />
            Preparing your checkout…
          </div>
        ) : status === "error" ? (
          <div className="text-sm" style={{ color: "rgba(255,200,200,0.9)" }}>
            <div>{error || "Something went wrong."}</div>
            {details ? (
              <div className="mt-2 text-xs" style={{ color: "rgba(255,200,200,0.75)" }}>
                {details}
              </div>
            ) : null}
          </div>
        ) : (
          <div className="text-sm" style={{ color: "rgba(255,255,255,0.75)" }}>
            Starting checkout…
          </div>
        )}

        <div className="mt-6 flex flex-col sm:flex-row gap-3">
          <Link
            href="/prices"
            className="h-11 px-6 rounded-xl flex items-center justify-center font-semibold text-sm border border-white/15 text-white/85 hover:bg-white/5 transition-all"
          >
            Back to Pricing
          </Link>
          <Link
            href="/contact"
            className="h-11 px-6 rounded-xl flex items-center justify-center font-semibold text-sm bg-[#185fa5] text-white hover:bg-[#1d4ed8] transition-all"
          >
            Contact Sales <ArrowRight className="w-4 h-4 ml-1" />
          </Link>
        </div>
      </div>
    </main>
  );
}

