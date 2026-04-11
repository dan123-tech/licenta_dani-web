"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { Mail, MessageSquare, Clock, ArrowRight, CheckCircle, Loader2 } from "lucide-react";
import LandingSiteHeader from "@/components/landing/LandingSiteHeader";
import LandingSiteFooter from "@/components/landing/LandingSiteFooter";
import { LANDING_COL } from "@/components/landing/landingTheme";
import { useI18n } from "@/i18n/I18nProvider";

const COL = LANDING_COL;

function InputField({ id, label, type = "text", value, onChange, required = true }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-xs font-semibold uppercase tracking-wide" style={{ color: "rgba(255,255,255,0.55)" }}>
        {label}{required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      <input
        id={id}
        name={id}
        type={type}
        value={value}
        onChange={onChange}
        required={required}
        className="w-full h-11 rounded-xl px-4 text-sm text-white placeholder:text-white/30 outline-none transition-all"
        style={{
          background: "rgba(255,255,255,0.07)",
          border: "1px solid rgba(255,255,255,0.12)",
        }}
        onFocus={(e) => { e.target.style.borderColor = "rgba(24,95,165,0.7)"; e.target.style.boxShadow = "0 0 0 3px rgba(24,95,165,0.15)"; }}
        onBlur={(e) => { e.target.style.borderColor = "rgba(255,255,255,0.12)"; e.target.style.boxShadow = "none"; }}
      />
    </div>
  );
}

function TextareaField({ id, label, value, onChange, rows = 5, required = true }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-xs font-semibold uppercase tracking-wide" style={{ color: "rgba(255,255,255,0.55)" }}>
        {label}{required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      <textarea
        id={id}
        name={id}
        rows={rows}
        value={value}
        onChange={onChange}
        required={required}
        className="w-full rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/30 outline-none transition-all resize-none"
        style={{
          background: "rgba(255,255,255,0.07)",
          border: "1px solid rgba(255,255,255,0.12)",
        }}
        onFocus={(e) => { e.target.style.borderColor = "rgba(24,95,165,0.7)"; e.target.style.boxShadow = "0 0 0 3px rgba(24,95,165,0.15)"; }}
        onBlur={(e) => { e.target.style.borderColor = "rgba(255,255,255,0.12)"; e.target.style.boxShadow = "none"; }}
      />
    </div>
  );
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

const REASONS = [
  { icon: MessageSquare, label: "Sales inquiry",   desc: "Pricing, demos, custom plans" },
  { icon: Clock,         label: "Technical support", desc: "Setup help, bugs, questions" },
  { icon: Mail,          label: "Partnership",     desc: "Integrations, reselling, OEM" },
];

export default function ContactPageClient() {
  const { t } = useI18n();
  const [firstName, setFirstName] = useState("");
  const [lastName,  setLastName]  = useState("");
  const [email,     setEmail]     = useState("");
  const [subject,   setSubject]   = useState("");
  const [message,   setMessage]   = useState("");
  const [status,    setStatus]    = useState("idle");
  const [errorMsg,  setErrorMsg]  = useState("");

  const onSubmit = useCallback(async (e) => {
    e.preventDefault();
    setErrorMsg("");
    setStatus("sending");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ firstName, lastName, email, message: subject ? `[${subject}] ${message}` : message }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErrorMsg(data.error === "inbox_not_configured" || data.error === "email_not_configured"
          ? t("landing.contactForm.errorConfig")
          : t("landing.contactForm.errorGeneric"));
        setStatus("idle");
        return;
      }
      setStatus("success");
      setFirstName(""); setLastName(""); setEmail(""); setSubject(""); setMessage("");
    } catch {
      setErrorMsg(t("landing.contactForm.errorGeneric"));
      setStatus("idle");
    }
  }, [firstName, lastName, email, subject, message, t]);

  return (
    <div className="min-h-screen flex flex-col" style={{ background: COL.base }}>
      <LandingSiteHeader />

      <main className="flex-1 w-full">

        {/* ── HERO ── */}
        <section className="relative overflow-hidden">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-[500px] h-[280px] rounded-full opacity-20"
              style={{ background: "radial-gradient(ellipse, #185fa5 0%, transparent 70%)" }} />
          </div>
          <div className="relative max-w-3xl mx-auto px-5 pt-14 pb-12 text-center">
            <Badge>Contact us</Badge>
            <h1 className="mt-5 text-3xl sm:text-4xl font-bold text-white tracking-tight mb-3">
              Let's talk
            </h1>
            <p className="text-base max-w-lg mx-auto leading-relaxed" style={{ color: "rgba(255,255,255,0.55)" }}>
              Sales questions, custom deployments, demos or just a quick chat — we're here.
            </p>
          </div>
        </section>

        {/* ── MAIN ── */}
        <section className="max-w-6xl mx-auto px-5 pb-16">
          <div className="grid lg:grid-cols-5 gap-8 items-start">

            {/* ── LEFT: info ── */}
            <div className="lg:col-span-2 flex flex-col gap-6">

              {/* Reason cards */}
              <div className="flex flex-col gap-3">
                {REASONS.map(({ icon: Icon, label, desc }) => (
                  <div key={label} className="flex items-start gap-3.5 p-4 rounded-2xl border"
                    style={{ background: "rgba(255,255,255,0.04)", borderColor: "rgba(255,255,255,0.08)" }}>
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                      style={{ background: "rgba(24,95,165,0.2)", border: "1px solid rgba(24,95,165,0.35)" }}>
                      <Icon className="w-4 h-4" style={{ color: "#7ec0ea" }} strokeWidth={1.7} />
                    </div>
                    <div>
                      <p className="font-semibold text-white text-sm">{label}</p>
                      <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.45)" }}>{desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Response time */}
              <div className="p-5 rounded-2xl border"
                style={{ background: "rgba(24,95,165,0.1)", borderColor: "rgba(24,95,165,0.3)" }}>
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="w-4 h-4" style={{ color: "#93c5fd" }} />
                  <span className="font-semibold text-white text-sm">Response time</span>
                </div>
                <p className="text-[12.5px] leading-relaxed" style={{ color: "rgba(255,255,255,0.55)" }}>
                  We typically reply within <strong className="text-white">24 hours</strong> on business days.
                  For urgent technical issues please mention it in your message.
                </p>
              </div>

              {/* What to expect */}
              <div>
                <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: "#93c5fd" }}>
                  What happens next
                </p>
                <ul className="space-y-3">
                  {[
                    "We receive your message instantly",
                    "A team member reviews your request",
                    "You get a personal reply within 24 h",
                    "We schedule a call or demo if needed",
                  ].map((step, i) => (
                    <li key={step} className="flex items-start gap-3 text-[12.5px]" style={{ color: "rgba(255,255,255,0.6)" }}>
                      <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5"
                        style={{ background: "rgba(24,95,165,0.25)", border: "1px solid rgba(24,95,165,0.45)", color: "#93c5fd" }}>
                        {i + 1}
                      </span>
                      {step}
                    </li>
                  ))}
                </ul>
              </div>

              <p className="text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>
                Looking for documentation?{" "}
                <Link href="/support" className="text-[#7ec0ea] hover:underline font-medium">Visit our support page →</Link>
              </p>
            </div>

            {/* ── RIGHT: form ── */}
            <div className="lg:col-span-3">
              <div className="rounded-2xl border p-6 sm:p-8"
                style={{ background: "rgba(255,255,255,0.04)", borderColor: "rgba(255,255,255,0.09)" }}>
                <h2 className="font-bold text-white text-lg mb-6">Send us a message</h2>

                {status === "success" ? (
                  <div className="flex flex-col items-center gap-4 py-12 text-center">
                    <div className="w-14 h-14 rounded-full flex items-center justify-center"
                      style={{ background: "rgba(134,239,172,0.12)", border: "1px solid rgba(134,239,172,0.3)" }}>
                      <CheckCircle className="w-7 h-7" style={{ color: "#86efac" }} />
                    </div>
                    <div>
                      <h3 className="font-bold text-white text-lg mb-1">Message sent!</h3>
                      <p className="text-sm" style={{ color: "rgba(255,255,255,0.55)" }}>
                        Thanks for reaching out. We'll be in touch within 24 hours.
                      </p>
                    </div>
                    <button onClick={() => setStatus("idle")}
                      className="mt-2 text-sm font-semibold text-[#7ec0ea] hover:underline">
                      Send another message
                    </button>
                  </div>
                ) : (
                  <form onSubmit={onSubmit} className="flex flex-col gap-5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <InputField id="contact-first" label="First name" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
                      <InputField id="contact-last"  label="Last name"  value={lastName}  onChange={(e) => setLastName(e.target.value)} />
                    </div>
                    <InputField id="contact-email"   label="Email address" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                    <InputField id="contact-subject" label="Subject" value={subject} onChange={(e) => setSubject(e.target.value)} required={false} />
                    <TextareaField id="contact-message" label="Message" value={message} onChange={(e) => setMessage(e.target.value)} rows={5} />

                    {errorMsg && (
                      <div className="p-3 rounded-xl text-sm border" style={{ background: "rgba(239,68,68,0.1)", borderColor: "rgba(239,68,68,0.3)", color: "#fca5a5" }}>
                        {errorMsg}
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={status === "sending"}
                      className="flex items-center justify-center gap-2 h-12 rounded-xl text-white font-semibold text-sm bg-[#185fa5] hover:bg-[#1d4ed8] disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_4px_20px_rgba(24,95,165,0.4)] transition-all"
                    >
                      {status === "sending" ? (
                        <><Loader2 className="w-4 h-4 animate-spin" /> Sending…</>
                      ) : (
                        <>Send Message <ArrowRight className="w-4 h-4" /></>
                      )}
                    </button>

                    <p className="text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>
                      Your information is only used to respond to your enquiry. See our{" "}
                      <Link href="/privacy" className="text-[#7ec0ea] hover:underline">Privacy Policy</Link>.
                    </p>
                  </form>
                )}
              </div>
            </div>
          </div>
        </section>

      </main>

      <LandingSiteFooter />
    </div>
  );
}
