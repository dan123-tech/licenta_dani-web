"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ChevronDown, Menu, X } from "lucide-react";
import { useI18n } from "@/i18n/I18nProvider";
import LanguageCurrencySwitcher from "@/components/LanguageCurrencySwitcher";
import FleetShareBrandBlock from "@/components/FleetShareBrandBlock";

const navLinkClass =
  "text-[13px] font-medium px-2.5 py-2 rounded-lg transition-colors hover:text-white/90 hover:bg-white/5 outline-none focus-visible:ring-2 focus-visible:ring-[#185fa5]/60";
const navMuted = { color: "rgba(255,255,255,0.72)" };

const mobileNavRow =
  "flex items-center gap-3 rounded-xl px-4 py-3.5 text-[15px] font-medium transition-colors hover:bg-white/5 active:bg-white/10 outline-none focus-visible:ring-2 focus-visible:ring-[#185fa5]/60";

function closeDetails(el) {
  const d = el?.closest?.("details");
  if (d) d.open = false;
}

export default function LandingSiteHeader({ logoPriority = false }) {
  const { t } = useI18n();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (!mobileOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e) => {
      if (e.key === "Escape") setMobileOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [mobileOpen]);

  const closeMobile = () => setMobileOpen(false);

  return (
    <header
      className="border-b sticky top-0 z-30"
      style={{
        borderColor: "rgba(255,255,255,0.07)",
        background: "rgba(12, 18, 32, 0.92)",
        backdropFilter: "blur(12px)",
      }}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-5 py-3 sm:py-3.5 flex items-center gap-x-3 gap-y-2">
        <Link href="/" className="flex items-center min-w-0 shrink-0 hover:opacity-90 transition-opacity" onClick={closeMobile}>
          <FleetShareBrandBlock
            tone="dark"
            size="nav"
            priority={logoPriority}
            className="max-w-[min(220px,62vw)] sm:max-w-[min(260px,70vw)] md:max-w-[min(300px,82vw)]"
          />
        </Link>

        <nav
          className="hidden md:flex flex-1 min-w-0 flex-wrap items-center gap-x-0.5 gap-y-1 sm:gap-x-1 ml-4 sm:ml-8 md:ml-10"
          aria-label="Primary"
        >
          <Link href="/" className={navLinkClass} style={navMuted}>
            {t("landing.nav.home")}
          </Link>
          <details className="relative group">
            <summary
              className={`${navLinkClass} list-none cursor-pointer inline-flex items-center gap-1 [&::-webkit-details-marker]:hidden`}
              style={navMuted}
            >
              {t("landing.nav.products")}
              <ChevronDown className="w-3.5 h-3.5 opacity-70 shrink-0" strokeWidth={2} aria-hidden />
            </summary>
            <div
              className="absolute left-0 top-full z-30 mt-1 min-w-[min(100vw-2rem,260px)] rounded-xl border py-1.5 shadow-xl sm:min-w-[240px]"
              style={{
                borderColor: "rgba(255,255,255,0.12)",
                background: "rgba(12, 18, 32, 0.98)",
                backdropFilter: "blur(12px)",
              }}
            >
              <Link
                href="/register"
                className="block px-3 py-2.5 transition-colors hover:bg-white/5"
                style={navMuted}
                onClick={(e) => closeDetails(e.currentTarget)}
              >
                <span className="block text-[13px] font-semibold text-white/90">{t("landing.nav.webTitle")}</span>
                <span className="block text-[11px] mt-0.5 opacity-70">{t("landing.nav.webSub")}</span>
              </Link>
              <Link
                href="/products/mobile"
                className="block px-3 py-2.5 transition-colors hover:bg-white/5 border-t border-white/10"
                style={navMuted}
                onClick={(e) => closeDetails(e.currentTarget)}
              >
                <span className="block text-[13px] font-semibold text-white/90">{t("landing.nav.mobileTitle")}</span>
                <span className="block text-[11px] mt-0.5 opacity-70">{t("landing.nav.mobileSub")}</span>
              </Link>
            </div>
          </details>
          <Link href="/prices" className={navLinkClass} style={navMuted}>
            {t("landing.nav.prices")}
          </Link>
          <Link href="/contact" className={navLinkClass} style={navMuted}>
            {t("landing.nav.contact")}
          </Link>
        </nav>

        <div className="hidden md:flex flex-wrap items-center justify-end gap-2 sm:gap-3 shrink-0 ml-auto">
          <LanguageCurrencySwitcher variant="landing" showCurrency={false} />
          <div className="hidden sm:block w-px h-9 shrink-0 bg-white/15" aria-hidden />
          <Link
            href="/login"
            className="text-[13px] font-medium px-3 py-2 rounded-lg transition-colors hover:text-white/90 hover:bg-white/5"
            style={navMuted}
          >
            {t("landing.signIn")}
          </Link>
          <Link
            href="/register"
            className="text-[13px] font-semibold px-3.5 py-2 rounded-lg text-white transition-colors shadow-sm bg-[#185fa5] hover:bg-[#1d4ed8] border border-white/10"
          >
            {t("landing.getStarted")}
          </Link>
        </div>

        <button
          type="button"
          className="md:hidden ml-auto inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-white/90 hover:bg-white/10 transition-colors"
          aria-label={mobileOpen ? t("sidebar.closeMenu") : t("common.openMenu")}
          aria-expanded={mobileOpen}
          aria-controls="landing-mobile-nav"
          onClick={() => setMobileOpen((o) => !o)}
        >
          {mobileOpen ? <X className="w-5 h-5" strokeWidth={2} aria-hidden /> : <Menu className="w-5 h-5" strokeWidth={2} aria-hidden />}
        </button>
      </div>

      {mobileOpen && (
        <div
          id="landing-mobile-nav"
          className="fixed inset-0 z-[100] md:hidden isolate"
          role="dialog"
          aria-modal="true"
          aria-label={t("landing.nav.menuTitle")}
        >
          <button
            type="button"
            className="absolute inset-0 z-0 bg-black/70"
            aria-label={t("sidebar.closeMenu")}
            onClick={closeMobile}
          />
          <div
            className="relative z-10 ml-auto flex h-full min-h-0 max-h-[100dvh] w-[min(100%,20rem)] max-w-full flex-col overflow-hidden border-l shadow-2xl bg-[#0c1220]"
            style={{ borderColor: "rgba(255,255,255,0.1)" }}
          >
            <div
              className="flex shrink-0 items-center justify-between border-b px-4 py-3"
              style={{ borderColor: "rgba(255,255,255,0.08)" }}
            >
              <span className="text-sm font-semibold tracking-wide text-white/90">{t("landing.nav.menuTitle")}</span>
              <button
                type="button"
                className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-white/85 hover:bg-white/10"
                aria-label={t("sidebar.closeMenu")}
                onClick={closeMobile}
              >
                <X className="w-5 h-5" strokeWidth={2} aria-hidden />
              </button>
            </div>

            <nav
              className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto overscroll-contain px-3 py-3"
              aria-label="Primary"
            >
              <Link href="/" className={mobileNavRow} style={navMuted} onClick={closeMobile}>
                {t("landing.nav.home")}
              </Link>
              <p className="px-4 pt-3 pb-1 text-[10px] font-bold uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.45)" }}>
                {t("landing.nav.products")}
              </p>
              <Link href="/register" className={`${mobileNavRow} pl-6`} style={navMuted} onClick={closeMobile}>
                {t("landing.nav.webTitle")}
              </Link>
              <Link href="/products/mobile" className={`${mobileNavRow} pl-6`} style={navMuted} onClick={closeMobile}>
                {t("landing.nav.mobileTitle")}
              </Link>
              <Link href="/prices" className={`${mobileNavRow} mt-1`} style={navMuted} onClick={closeMobile}>
                {t("landing.nav.prices")}
              </Link>
              <Link href="/contact" className={mobileNavRow} style={navMuted} onClick={closeMobile}>
                {t("landing.nav.contact")}
              </Link>
            </nav>

            <div
              className="shrink-0 space-y-3 border-t bg-[#0c1220] px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]"
              style={{ borderColor: "rgba(255,255,255,0.08)" }}
            >
              <div className="w-full min-w-0 max-w-full [&_.landing-locale-select]:w-full [&_.landing-locale-select]:min-w-0">
                <LanguageCurrencySwitcher variant="landing" showCurrency={false} idSuffix="-drawer" />
              </div>
              <div className="flex flex-col gap-2">
                <Link
                  href="/login"
                  className="flex h-11 w-full items-center justify-center rounded-xl text-sm font-medium transition-colors hover:bg-white/10"
                  style={{ ...navMuted, border: "1px solid rgba(255,255,255,0.14)" }}
                  onClick={closeMobile}
                >
                  {t("landing.signIn")}
                </Link>
                <Link
                  href="/register"
                  className="flex h-11 w-full items-center justify-center rounded-xl text-sm font-semibold text-white bg-[#185fa5] hover:bg-[#1d4ed8] border border-white/10 transition-colors"
                  onClick={closeMobile}
                >
                  {t("landing.getStarted")}
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
