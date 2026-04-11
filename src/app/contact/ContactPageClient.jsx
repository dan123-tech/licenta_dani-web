"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import LandingSiteHeader from "@/components/landing/LandingSiteHeader";
import LandingSiteFooter from "@/components/landing/LandingSiteFooter";
import { useI18n } from "@/i18n/I18nProvider";

const SUBMIT_COLOR = "#512DA8";

function OutlinedField({ id, label, type = "text", value, onChange, as, rows }) {
  const common =
    "w-full rounded-md border border-neutral-300 bg-white px-3 pt-3 pb-2.5 text-sm text-neutral-900 placeholder:text-neutral-400 outline-none focus:border-[#512DA8] focus:ring-1 focus:ring-[#512DA8]";
  if (as === "textarea") {
    return (
      <div className="relative">
        <label htmlFor={id} className="absolute -top-2.5 left-3 z-[1] bg-white px-1 text-xs font-medium text-neutral-600">
          {label}
        </label>
        <textarea
          id={id}
          name={id}
          rows={rows || 5}
          className={common}
          placeholder={label}
          value={value}
          onChange={onChange}
          required
        />
      </div>
    );
  }
  return (
    <div className="relative">
      <label htmlFor={id} className="absolute -top-2.5 left-3 z-[1] bg-white px-1 text-xs font-medium text-neutral-600">
        {label}
      </label>
      <input
        id={id}
        name={id}
        type={type}
        className={common}
        placeholder={label}
        value={value}
        onChange={onChange}
        required
      />
    </div>
  );
}

export default function ContactPageClient() {
  const { t } = useI18n();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const onSubmit = useCallback(
    async (e) => {
      e.preventDefault();
      setErrorMsg("");
      setStatus("sending");
      try {
        const res = await fetch("/api/contact", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            firstName,
            lastName,
            email,
            message,
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          if (data.error === "inbox_not_configured" || data.error === "email_not_configured") {
            setErrorMsg(t("landing.contactForm.errorConfig"));
          } else {
            setErrorMsg(t("landing.contactForm.errorGeneric"));
          }
          setStatus("idle");
          return;
        }
        setStatus("success");
        setFirstName("");
        setLastName("");
        setEmail("");
        setMessage("");
      } catch {
        setErrorMsg(t("landing.contactForm.errorGeneric"));
        setStatus("idle");
      }
    },
    [firstName, lastName, email, message, t]
  );

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#0c1220" }}>
      <LandingSiteHeader />

      <div className="flex-1 bg-slate-100 py-10 px-4">
        <div className="max-w-lg mx-auto bg-white rounded-xl shadow-sm border border-slate-200 p-6 sm:p-8">
          <h1 className="text-xl font-bold text-neutral-900 mb-1">{t("landing.contactForm.pageTitle")}</h1>
          <p className="text-sm text-neutral-600 mb-6">{t("landing.contactForm.pageSubtitle")}</p>

          <form onSubmit={onSubmit} className="flex flex-col gap-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <OutlinedField
                id="contact-first"
                label={t("landing.contactForm.firstName")}
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
              />
              <OutlinedField
                id="contact-last"
                label={t("landing.contactForm.lastName")}
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
              />
            </div>
            <OutlinedField
              id="contact-email"
              label={t("landing.contactForm.email")}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <OutlinedField
              id="contact-message"
              label={t("landing.contactForm.message")}
              as="textarea"
              rows={5}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />

            {errorMsg ? <p className="text-sm text-red-600">{errorMsg}</p> : null}
            {status === "success" ? (
              <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg p-3">{t("landing.contactForm.success")}</p>
            ) : null}

            <button
              type="submit"
              disabled={status === "sending"}
              className="w-full sm:w-auto rounded-lg px-6 py-3 text-sm font-semibold text-white shadow-sm transition-opacity disabled:opacity-60 hover:opacity-95"
              style={{ background: SUBMIT_COLOR }}
            >
              {status === "sending" ? t("landing.contactForm.sending") : t("landing.contactForm.submit")}
            </button>
          </form>

          <p className="mt-6 text-xs text-neutral-500">
            <Link href="/support" className="text-[#185fa5] font-medium hover:underline">
              {t("landing.sections.contactSupport")}
            </Link>
          </p>
        </div>
      </div>

      <LandingSiteFooter />
    </div>
  );
}
