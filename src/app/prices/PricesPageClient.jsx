"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle, ArrowRight, Server, Zap, Building2, HelpCircle, Sparkles } from "lucide-react";
import LandingSiteHeader from "@/components/landing/LandingSiteHeader";
import LandingSiteFooter from "@/components/landing/LandingSiteFooter";
import { LANDING_COL } from "@/components/landing/landingTheme";

const COL = LANDING_COL;

function getStripePriceId(planId) {
  if (planId === "starter")      return process.env.NEXT_PUBLIC_STRIPE_PRICE_STARTER || "";
  if (planId === "starter_plus") return process.env.NEXT_PUBLIC_STRIPE_PRICE_STARTER_PLUS || "";
  if (planId === "premium")      return process.env.NEXT_PUBLIC_STRIPE_PRICE_PREMIUM || "";
  if (planId === "corporate")    return process.env.NEXT_PUBLIC_STRIPE_PRICE_CORPORATE || "";
  return "";
}

function Badge({ children }) {
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold uppercase tracking-widest"
      style={{ background: "rgba(24,95,165,0.2)", border: "1px solid rgba(24,95,165,0.4)", color: "#93c5fd" }}>
      <span className="w-1.5 h-1.5 rounded-full bg-[#f5a623] shrink-0" />
      {children}
    </span>
  );
}

const PLANS = [
  {
    id: "free",
    icon: Zap,
    name: "Free",
    priceMonthly: "€0",
    priceYearly: "€0",
    priceSub: "/ car / mo",
    accent: "#7ec0ea",
    accentBg: "rgba(24,95,165,0.15)",
    accentBorder: "rgba(24,95,165,0.3)",
    highlight: false,
    description: "Core fleet workflow for small teams getting started.",
    cta: "Get Started Free",
    ctaHref: "/register",
    ctaStyle: "outline",
    features: [
      "Up to 5 vehicles",
      "Unlimited drivers",
      "Scheduled & instant reservations",
      "Automatic journey sheet PDFs",
      "Digital Glovebox (ITP, RCA, vignette)",
      "Incident reporting with files",
      "Booking calendar",
      "Basic statistics dashboard",
      "Android app included",
      "Email support",
    ],
  },
  {
    id: "starter",
    icon: Building2,
    name: "Starter",
    priceMonthly: "€0.35",
    priceYearly: "€0.28",
    priceSub: "/ car / mo",
    accent: "#f5a623",
    accentBg: "rgba(245,166,35,0.12)",
    accentBorder: "rgba(245,166,35,0.35)",
    highlight: true,
    description: "More capacity for small businesses ready to grow.",
    cta: "Buy Starter",
    ctaHref: "/prices",
    ctaStyle: "primary",
    badge: "Most popular",
    features: [
      "Up to 25 vehicles",
      "Unlimited drivers",
      "Everything in Free, plus:",
      "Maintenance scheduling & alerts",
      "Excel / CSV data export",
      "Priority email support",
    ],
  },
  {
    id: "starter_plus",
    icon: Building2,
    name: "Starter Plus",
    priceMonthly: "€0.50",
    priceYearly: "€0.40",
    priceSub: "/ car / mo",
    accent: "#93c5fd",
    accentBg: "rgba(147,197,253,0.12)",
    accentBorder: "rgba(147,197,253,0.3)",
    highlight: false,
    description: "Advanced reporting and controls for mid-size fleets.",
    cta: "Buy Starter Plus",
    ctaHref: "/prices",
    ctaStyle: "outline",
    features: [
      "Up to 100 vehicles",
      "Everything in Starter, plus:",
      "Advanced analytics & cost tracking",
      "Monthly cost reports (PDF)",
      "Full audit log",
      "Chat support",
    ],
  },
  {
    id: "premium",
    icon: Sparkles,
    name: "Premium",
    priceMonthly: "€0.65",
    priceYearly: "€0.52",
    priceSub: "/ car / mo",
    accent: "#f472b6",
    accentBg: "rgba(244,114,182,0.12)",
    accentBorder: "rgba(244,114,182,0.28)",
    highlight: false,
    description: "For larger fleets that need deeper insights and automation.",
    cta: "Buy Premium",
    ctaHref: "/prices",
    ctaStyle: "outline",
    features: [
      "Unlimited vehicles",
      "Everything in Starter Plus, plus:",
      "KM heatmap & top-driver rankings",
      "Incident workflow improvements",
      "Priority chat support",
    ],
  },
  {
    id: "corporate",
    icon: Building2,
    name: "Corporate",
    priceMonthly: "€0.80",
    priceYearly: "€0.64",
    priceSub: "/ car / mo",
    accent: "#a78bfa",
    accentBg: "rgba(167,139,250,0.12)",
    accentBorder: "rgba(167,139,250,0.28)",
    highlight: false,
    description: "Full governance, multi-currency and SLA-backed support.",
    cta: "Buy Corporate",
    ctaHref: "/prices",
    ctaStyle: "outline",
    features: [
      "Unlimited vehicles",
      "Everything in Premium, plus:",
      "Bilingual interface (EN / RO)",
      "Multi-currency support",
      "SLA-backed support",
    ],
  },
  {
    id: "enterprise",
    icon: Server,
    name: "Enterprise",
    priceMonthly: "Custom",
    priceYearly: "Custom",
    priceSub: "self-hosted",
    accent: "#86efac",
    accentBg: "rgba(134,239,172,0.1)",
    accentBorder: "rgba(134,239,172,0.25)",
    highlight: false,
    description: "Run FleetShare on your own infrastructure with full data sovereignty.",
    cta: "Contact Sales",
    ctaHref: "/contact",
    ctaStyle: "outline",
    features: [
      "Everything in Corporate, plus:",
      "Deploy on your own server or VPS",
      "Docker Compose setup",
      "PostgreSQL database — your data",
      "White-label branding",
      "Custom domain",
      "Dedicated setup assistance",
      "SLA-backed support",
    ],
  },
];

const FAQS = [
  {
    q: "Is the Free plan really free forever?",
    a: "Yes. The Free plan has no time limit and is designed for small organisations with up to 5 vehicles that need the core features.",
  },
  {
    q: "What happens if I exceed the vehicle limit?",
    a: "You can upgrade at any time. Your data stays intact and you keep the same account — no migration needed.",
  },
  {
    q: "Can I try paid features before buying?",
    a: "Yes — contact us for a free trial period. We will enable the plan features on your account so you can evaluate them with your real fleet data.",
  },
  {
    q: "What does 'self-hosted' mean exactly?",
    a: "You run the entire application — Next.js server, PostgreSQL database and file storage — on infrastructure you control. We provide Docker Compose files and full setup guidance.",
  },
  {
    q: "Is the Android app included in all plans?",
    a: "Yes. The Android APK is downloadable from your dashboard on every plan at no extra cost.",
  },
  {
    q: "Do you offer discounts for non-profits or education?",
    a: "Yes — please contact us with details about your organisation and we will provide a custom quote.",
  },
];

export default function PricesPageClient() {
  const router = useRouter();
  const [billing, setBilling] = React.useState("monthly");
  const [buying, setBuying] = React.useState({});
  const [buyError, setBuyError] = React.useState("");

  async function startCheckout(plan) {
    setBuyError("");
    setBuying((s) => ({ ...s, [plan.id]: true }));
    try {
      router.push(`/payment?plan=${encodeURIComponent(plan.id)}`);
    } catch {
      setBuyError("Could not start checkout. Please try again.");
    } finally {
      setBuying((s) => ({ ...s, [plan.id]: false }));
    }
  }

  const canBuy = (plan) => plan.id !== "free" && plan.id !== "enterprise";

  return (
    <div className="min-h-screen flex flex-col overflow-x-hidden" style={{ background: COL.base }}>
      <LandingSiteHeader />

      <main className="flex-1 w-full">

        {/* ── HERO ── */}
        <section className="relative overflow-hidden">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-[600px] h-[300px] rounded-full opacity-20"
              style={{ background: "radial-gradient(ellipse, #185fa5 0%, transparent 70%)" }} />
          </div>
          <div className="relative max-w-3xl mx-auto px-4 sm:px-5 pt-12 sm:pt-14 pb-10 sm:pb-12 text-center">
            <Badge>Pricing</Badge>
            <h1 className="mt-5 text-2xl min-[400px]:text-3xl sm:text-4xl font-bold tracking-tight mb-4 text-balance px-1" style={{ color: "#ffffff" }}>
              Simple, transparent pricing
            </h1>
            <p className="text-base max-w-lg mx-auto leading-relaxed" style={{ color: "rgba(255,255,255,0.55)" }}>
              Start free, scale when you need to. No hidden fees, no per-seat charges.
            </p>
          </div>
        </section>

        {/* ── BILLING TOGGLE ── */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <button
            type="button"
            onClick={() => setBilling("monthly")}
            className="text-sm font-semibold px-4 py-1.5 rounded-lg transition-all duration-200"
            style={{
              background: billing === "monthly" ? "rgba(255,255,255,0.1)" : "transparent",
              color: billing === "monthly" ? "#ffffff" : "rgba(255,255,255,0.45)",
            }}
          >
            Monthly
          </button>

          {/* pill toggle */}
          <button
            type="button"
            onClick={() => setBilling(billing === "monthly" ? "yearly" : "monthly")}
            className="relative w-12 h-6 rounded-full transition-all duration-300 shrink-0"
            style={{ background: billing === "yearly" ? "#f5a623" : "rgba(255,255,255,0.15)" }}
            aria-label="Toggle billing period"
          >
            <span
              className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-all duration-300"
              style={{ transform: billing === "yearly" ? "translateX(24px)" : "translateX(0)" }}
            />
          </button>

          <button
            type="button"
            onClick={() => setBilling("yearly")}
            className="flex items-center gap-2 text-sm font-semibold px-4 py-1.5 rounded-lg transition-all duration-200"
            style={{
              background: billing === "yearly" ? "rgba(245,166,35,0.12)" : "transparent",
              color: billing === "yearly" ? "#f5a623" : "rgba(255,255,255,0.45)",
            }}
          >
            Yearly
            <span
              className="text-[10px] font-bold px-1.5 py-0.5 rounded-full transition-all duration-200"
              style={{
                background: billing === "yearly" ? "#f5a623" : "rgba(255,255,255,0.1)",
                color: billing === "yearly" ? "#0c1220" : "rgba(255,255,255,0.5)",
              }}
            >
              −20%
            </span>
          </button>
        </div>

        {/* ── ERROR BANNER ── */}
        {buyError && (
          <div className="max-w-6xl mx-auto px-4 sm:px-5 mb-2">
            <div className="rounded-2xl border px-4 py-3 text-sm"
              style={{ borderColor: "rgba(255,80,80,0.3)", background: "rgba(255,80,80,0.07)", color: "rgba(255,200,200,0.9)" }}>
              {buyError}
            </div>
          </div>
        )}

        {/* ── PLANS — single row ── */}
        <section className="w-full pb-16">
          <div className="overflow-x-auto px-4 sm:px-6 pt-8 pb-8"
            style={{ WebkitOverflowScrolling: "touch" }}>
            <div className="flex gap-4 w-max xl:w-auto xl:grid xl:grid-cols-6 mx-auto"
              style={{ maxWidth: "min(100%, 1440px)" }}>
              {PLANS.map((plan) => (
                <div key={plan.id} className="w-[220px] sm:w-[230px] xl:w-auto flex relative">
                  <PlanCard plan={plan} billing={billing} buying={buying} canBuy={canBuy} startCheckout={startCheckout} />
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── FAQ ── */}
        <section className="max-w-3xl mx-auto px-4 sm:px-5 py-12 sm:py-14">
          <h2 className="text-2xl font-bold text-center mb-8" style={{ color: "#ffffff" }}>Frequently asked questions</h2>
          <div className="flex flex-col gap-4">
            {FAQS.map((faq) => (
              <div key={faq.q}
                className="p-5 rounded-2xl border transition-all duration-200 hover:border-white/20 hover:bg-white/[0.06]"
                style={{ background: "rgba(255,255,255,0.04)", borderColor: "rgba(255,255,255,0.09)" }}>
                <div className="flex items-start gap-3">
                  <HelpCircle className="w-4 h-4 mt-0.5 shrink-0" style={{ color: "#7ec0ea" }} />
                  <div>
                    <p className="font-semibold text-white text-sm mb-1.5">{faq.q}</p>
                    <p className="text-[12.5px] leading-relaxed" style={{ color: "rgba(255,255,255,0.55)" }}>{faq.a}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── CTA ── */}
        <section className="max-w-6xl mx-auto px-4 sm:px-5 pb-16">
          <div className="relative overflow-hidden rounded-2xl p-6 sm:p-8 md:p-12 text-center"
            style={{ background: "linear-gradient(135deg, rgba(24,95,165,0.3) 0%, rgba(29,78,216,0.2) 100%)", border: "1px solid rgba(24,95,165,0.4)" }}>
            <h2 className="text-2xl font-bold mb-3" style={{ color: "#ffffff" }}>Still have questions?</h2>
            <p className="text-sm mb-7 max-w-md mx-auto" style={{ color: "rgba(255,255,255,0.55)" }}>
              Our team is happy to walk you through the plans and help you choose the right one.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link href="/contact"
                className="flex items-center justify-center gap-2 h-12 px-7 rounded-xl text-white font-semibold text-sm bg-[#185fa5] hover:bg-[#1d4ed8] hover:scale-[1.03] active:scale-[0.98] transition-all duration-200 shadow-[0_4px_20px_rgba(24,95,165,0.45)]">
                Contact Sales <ArrowRight className="w-4 h-4" />
              </Link>
              <Link href="/register"
                className="flex items-center justify-center gap-2 h-12 px-7 rounded-xl font-semibold text-sm border border-white/15 hover:bg-white/10 hover:scale-[1.03] active:scale-[0.98] transition-all duration-200"
                style={{ color: "rgba(255,255,255,0.85)" }}>
                Start Free
              </Link>
            </div>
          </div>
        </section>

      </main>

      <LandingSiteFooter />
    </div>
  );
}

function PlanCard({ plan, billing, buying, canBuy, startCheckout }) {
  const Icon = plan.icon;
  const isYearly = billing === "yearly";
  const price = isYearly ? plan.priceYearly : plan.priceMonthly;
  const oldPrice = isYearly && plan.priceMonthly !== plan.priceYearly ? plan.priceMonthly : null;
  return (
    <div
      className="relative flex flex-col w-full rounded-2xl p-4 border transition-all duration-300 hover:-translate-y-2 hover:scale-[1.02] hover:z-10 cursor-default"
      style={{
        background: plan.highlight ? "rgba(245,166,35,0.06)" : "rgba(255,255,255,0.04)",
        borderColor: plan.highlight ? plan.accentBorder : "rgba(255,255,255,0.09)",
        boxShadow: plan.highlight ? `0 0 40px ${plan.accentBorder}` : "none",
      }}
      onMouseEnter={e => {
        e.currentTarget.style.boxShadow = `0 28px 56px rgba(0,0,0,0.5), 0 0 40px ${plan.accentBorder}`;
        e.currentTarget.style.borderColor = plan.accentBorder;
      }}
      onMouseLeave={e => {
        e.currentTarget.style.boxShadow = plan.highlight ? `0 0 40px ${plan.accentBorder}` : "none";
        e.currentTarget.style.borderColor = plan.highlight ? plan.accentBorder : "rgba(255,255,255,0.09)";
      }}
    >
      {/* Popular badge */}
      {plan.badge && (
        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 whitespace-nowrap">
          <span className="px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-widest"
            style={{ background: plan.accent, color: "#0c1220" }}>
            {plan.badge}
          </span>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: plan.accentBg, border: `1px solid ${plan.accentBorder}` }}>
          <Icon className="w-5 h-5" style={{ color: plan.accent }} strokeWidth={1.7} />
        </div>
        <span className="font-bold text-white text-base">{plan.name}</span>
      </div>

      {/* Price */}
      <div className="mb-1">
        <div className="flex items-end gap-2 flex-wrap">
          <span className="text-3xl font-bold transition-all duration-300" style={{ color: plan.highlight ? plan.accent : "#ffffff" }}>
            {price}
          </span>
          {oldPrice && (
            <span className="text-sm line-through mb-0.5 transition-all duration-200" style={{ color: "rgba(255,255,255,0.3)" }}>
              {oldPrice}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5 mt-0.5">
          <span className="text-[11px]" style={{ color: "rgba(255,255,255,0.4)" }}>{plan.priceSub}</span>
          {isYearly && plan.id !== "free" && plan.id !== "enterprise" && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
              style={{ background: "rgba(245,166,35,0.2)", color: "#f5a623" }}>
              −20%
            </span>
          )}
        </div>
      </div>
      <p className="text-[12.5px] mb-6 leading-relaxed" style={{ color: "rgba(255,255,255,0.5)" }}>
        {plan.description}
      </p>

      {/* CTA button */}
      {canBuy(plan) ? (
        <button
          type="button"
          onClick={() => startCheckout(plan)}
          disabled={Boolean(buying[plan.id])}
          className={`flex items-center justify-center gap-2 h-11 rounded-xl text-sm font-semibold mb-6 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60 disabled:pointer-events-none ${
            plan.ctaStyle === "primary"
              ? "text-[#0c1220] hover:opacity-90 shadow-[0_4px_16px_rgba(245,166,35,0.3)]"
              : "border text-white/85 hover:bg-white/8"
          }`}
          style={plan.ctaStyle === "primary" ? { background: plan.accent } : { borderColor: `${plan.accent}66` }}
        >
          {buying[plan.id] ? "Redirecting…" : "Buy now"} <ArrowRight className="w-4 h-4" />
        </button>
      ) : (
        <Link
          href={plan.ctaHref}
          className={`flex items-center justify-center gap-2 h-11 rounded-xl text-sm font-semibold mb-6 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] ${
            plan.ctaStyle === "primary"
              ? "text-[#0c1220] hover:opacity-90 shadow-[0_4px_16px_rgba(245,166,35,0.3)]"
              : "border text-white/85 hover:bg-white/8"
          }`}
          style={plan.ctaStyle === "primary" ? { background: plan.accent } : { borderColor: `${plan.accent}66` }}
        >
          {plan.cta} <ArrowRight className="w-4 h-4" />
        </Link>
      )}

      {/* Features */}
      <ul className="space-y-2.5 flex-1">
        {plan.features.map((f) => (
          <li key={f}
            className={`flex items-start gap-2 text-[12.5px] leading-snug ${f.endsWith(":") ? "font-semibold mt-3 first:mt-0" : ""}`}
            style={{ color: f.endsWith(":") ? "rgba(255,255,255,0.8)" : "rgba(255,255,255,0.65)" }}>
            {!f.endsWith(":") && (
              <CheckCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" style={{ color: plan.accent }} />
            )}
            {f}
          </li>
        ))}
      </ul>
    </div>
  );
}
