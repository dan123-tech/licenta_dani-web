"use client";

import Link from "next/link";
import { Download, HardDrive, MonitorSmartphone, Server, Sparkles } from "lucide-react";
import { useI18n } from "@/i18n/I18nProvider";

const COL = { base: "#0c1220", primary: "#185fa5", accent: "#f5a623" };

const AI_VALIDATOR_REPO = "https://github.com/dan123-tech/AI_driving-licence";

const DEFAULT_FULL_SERVER_REPO = "https://github.com/dan123-tech/licenta_dani-main";

function getFullServerRepoUrl() {
  const u = process.env.NEXT_PUBLIC_FULL_SERVER_REPO_URL;
  return typeof u === "string" && u.trim() ? u.trim() : DEFAULT_FULL_SERVER_REPO;
}

const downloadRowClass =
  "flex items-center justify-between gap-4 w-full px-4 py-3.5 rounded-xl border border-white/10 bg-white/[0.05] hover:border-[#185fa5]/50 hover:bg-white/[0.08] transition-colors text-left no-underline";

const codeClass = "text-[11px] sm:text-xs font-mono rounded px-1 py-0.5 bg-white/10 text-white/85";

/** Override with NEXT_PUBLIC_SOURCE_REPO_URL / NEXT_PUBLIC_SOURCE_ZIP_URL for forks. */
const DEFAULT_SOURCE_REPO = "https://github.com/dan123-tech/licenta_dani-web";
const DEFAULT_SOURCE_ZIP =
  "https://github.com/dan123-tech/licenta_dani-web/archive/refs/heads/main.zip";

function getSourceRepoUrl() {
  const u = process.env.NEXT_PUBLIC_SOURCE_REPO_URL;
  return typeof u === "string" && u.trim() ? u.trim() : DEFAULT_SOURCE_REPO;
}

function getSourceZipUrl() {
  const u = process.env.NEXT_PUBLIC_SOURCE_ZIP_URL;
  return typeof u === "string" && u.trim() ? u.trim() : DEFAULT_SOURCE_ZIP;
}

/** Served from public/downloads/fleetshare.apk — override with full URL if hosted elsewhere. */
const DEFAULT_ANDROID_APK_PATH = "/downloads/fleetshare.apk";

function getAndroidDownloadHref() {
  const env =
    typeof process.env.NEXT_PUBLIC_ANDROID_DOWNLOAD_URL === "string"
      ? process.env.NEXT_PUBLIC_ANDROID_DOWNLOAD_URL.trim()
      : "";
  return env || DEFAULT_ANDROID_APK_PATH;
}

function isSameOriginApkPath(href) {
  return href.startsWith("/") && !href.startsWith("//");
}

export default function DownloadPageClient() {
  const { t } = useI18n();
  const androidHref = getAndroidDownloadHref();

  return (
    <div className="min-h-screen" style={{ background: COL.base }}>
      <header
        className="border-b"
        style={{
          borderColor: "rgba(255,255,255,0.07)",
          background: "rgba(12, 18, 32, 0.92)",
          backdropFilter: "blur(12px)",
        }}
      >
        <div className="max-w-3xl mx-auto px-4 sm:px-5 py-3">
          <Link
            href="/"
            className="text-[13px] font-medium transition-colors hover:text-white/90"
            style={{ color: "rgba(255,255,255,0.72)" }}
          >
            {t("landing.download.backHome")}
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-5 py-10 sm:py-12">
        <h1
          className="text-2xl sm:text-3xl font-bold text-white mb-1"
          style={{ letterSpacing: "-0.03em" }}
        >
          {t("landing.download.pageTitle")}
        </h1>
        <p className="text-sm mb-6" style={{ color: "rgba(255,255,255,0.45)" }}>
          {t("landing.download.pageSubtitle")}
        </p>
        <p className="text-sm leading-relaxed mb-10" style={{ color: "rgba(255,255,255,0.55)" }}>
          {t("landing.download.intro")}
        </p>

        <section className="space-y-10">
          <div
            className="rounded-2xl p-5 sm:p-6"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            <div className="flex items-start gap-3 mb-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                style={{
                  background: "rgba(24, 95, 165, 0.22)",
                  border: "1px solid rgba(24, 95, 165, 0.4)",
                }}
              >
                <MonitorSmartphone className="w-5 h-5" style={{ color: "#7ec0ea" }} strokeWidth={1.6} />
              </div>
              <div className="min-w-0">
                <h2 className="text-base font-semibold text-white mb-2">{t("landing.download.webTitle")}</h2>
                <p className="text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.5)" }}>
                  {t("landing.download.webBody")}
                </p>
                <div className="flex flex-wrap gap-2 mt-4">
                  <Link
                    href="/register"
                    className="inline-flex items-center justify-center h-10 px-4 rounded-xl text-white text-sm font-semibold bg-[#185fa5] hover:bg-[#1d4ed8] transition-colors"
                  >
                    {t("landing.getStarted")}
                  </Link>
                  <Link
                    href="/login"
                    className="inline-flex items-center justify-center h-10 px-4 rounded-xl text-sm font-semibold transition-colors border border-white/15 text-white/80 hover:border-white/25 hover:bg-white/5"
                  >
                    {t("landing.signIn")}
                  </Link>
                </div>
              </div>
            </div>
          </div>

          <div
            className="rounded-2xl p-5 sm:p-6"
            style={{
              background: "rgba(245, 166, 35, 0.08)",
              border: "1px solid rgba(245, 166, 35, 0.32)",
            }}
          >
            <div className="flex items-start gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                style={{
                  background: "rgba(245, 166, 35, 0.16)",
                  border: "1px solid rgba(245, 166, 35, 0.4)",
                }}
              >
                <Server className="w-5 h-5" style={{ color: COL.accent }} strokeWidth={1.6} />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-base font-semibold mb-2" style={{ color: COL.accent }}>
                  {t("landing.download.selfHostTitle")}
                </h2>
                <p className="text-sm leading-relaxed mb-2" style={{ color: "rgba(255,255,255,0.52)" }}>
                  {t("landing.download.selfHostBody")}
                </p>
                <p className="text-xs leading-relaxed mb-4" style={{ color: "rgba(255,255,255,0.38)" }}>
                  {t("landing.download.selfHostWebOnlyHint")}
                </p>
                <div className="flex flex-wrap gap-2">
                  <a
                    href={getSourceZipUrl()}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-xl text-white text-sm font-semibold bg-[#185fa5] hover:bg-[#1d4ed8] transition-colors"
                  >
                    <Download className="w-4 h-4 shrink-0" strokeWidth={2} aria-hidden />
                    {t("landing.download.selfHostZipCta")}
                  </a>
                  <a
                    href={getSourceRepoUrl()}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center h-10 px-4 rounded-xl text-sm font-semibold transition-colors border border-white/15 text-white/85 hover:border-white/25 hover:bg-white/5"
                  >
                    {t("landing.download.selfHostRepoCta")}
                  </a>
                </div>
              </div>
            </div>
          </div>

          <section
            id="company-server"
            className="rounded-2xl p-5 sm:p-6 scroll-mt-24"
            style={{
              background: "rgba(24, 95, 165, 0.12)",
              border: "1px solid rgba(24, 95, 165, 0.35)",
            }}
          >
            <p
              className="text-[11px] font-semibold uppercase tracking-wide mb-2"
              style={{ color: "rgba(255,255,255,0.4)" }}
            >
              {t("landing.download.fullServerEyebrow")}
            </p>
            <div className="flex items-start gap-3 mb-4">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                style={{
                  background: "rgba(24, 95, 165, 0.25)",
                  border: "1px solid rgba(126, 192, 234, 0.45)",
                }}
              >
                <HardDrive className="w-5 h-5 text-sky-200" strokeWidth={1.6} aria-hidden />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-base font-semibold text-white mb-2">{t("landing.download.fullServerTitle")}</h2>
                <p className="text-sm leading-relaxed mb-2" style={{ color: "rgba(255,255,255,0.55)" }}>
                  {t("landing.download.fullServerBody")}
                </p>
                <p className="text-xs leading-relaxed mb-1" style={{ color: "rgba(255,255,255,0.38)" }}>
                  {t("landing.download.fullServerDeepLink")}
                </p>
                <p className="text-xs mb-1" style={{ color: "rgba(255,255,255,0.4)" }}>
                  {t("landing.download.fullServerRepoLabel")}
                </p>
                <a
                  href={getFullServerRepoUrl()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-semibold text-sky-400 hover:text-sky-300 hover:underline break-all"
                >
                  {getFullServerRepoUrl().replace(/^https:\/\//, "")}
                </a>
              </div>
            </div>

            <h3
              className="text-[11px] font-semibold uppercase tracking-wide mb-2 flex items-center gap-2"
              style={{ color: "rgba(255,255,255,0.38)" }}
            >
              <Download className="w-4 h-4 shrink-0 opacity-80" aria-hidden />
              {t("landing.download.fullServerDownloadsTitle")}
            </h3>
            <p className="text-xs leading-relaxed mb-4" style={{ color: "rgba(255,255,255,0.4)" }}>
              {t("landing.download.fullServerDownloadsHint")}
            </p>

            <ul className="space-y-4 mb-6">
              <li>
                <a
                  href="/downloads/fleetshare-full-server-install.sh"
                  download="fleetshare-full-server-install.sh"
                  className={downloadRowClass}
                >
                  <span className="min-w-0 text-left">
                    <span className="block font-semibold text-white text-sm font-mono break-all">
                      {t("landing.download.fullServerRowShFile")}
                    </span>
                    <span className="block text-xs mt-1" style={{ color: "rgba(255,255,255,0.45)" }}>
                      {t("landing.download.fullServerRowShFor")}
                    </span>
                  </span>
                  <span className="text-xs font-mono shrink-0" style={{ color: "rgba(255,255,255,0.35)" }}>
                    .sh
                  </span>
                </a>
                <p className="text-xs mt-2 ml-1 leading-relaxed" style={{ color: "rgba(255,255,255,0.38)" }}>
                  {t("landing.download.fullServerRowShCode")}
                </p>
              </li>
              <li>
                <a
                  href="/downloads/fleetshare-full-server-install.ps1"
                  download="fleetshare-full-server-install.ps1"
                  className={downloadRowClass}
                >
                  <span className="min-w-0 text-left">
                    <span className="block font-semibold text-white text-sm font-mono break-all">
                      {t("landing.download.fullServerRowPsFile")}
                    </span>
                    <span className="block text-xs mt-1" style={{ color: "rgba(255,255,255,0.45)" }}>
                      {t("landing.download.fullServerRowPsFor")}
                    </span>
                  </span>
                  <span className="text-xs font-mono shrink-0" style={{ color: "rgba(255,255,255,0.35)" }}>
                    .ps1
                  </span>
                </a>
                <p className="text-xs mt-2 ml-1 leading-relaxed" style={{ color: "rgba(255,255,255,0.38)" }}>
                  {t("landing.download.fullServerRowPsCode")}
                </p>
              </li>
              <li>
                <a
                  href="/downloads/fleetshare-full-server-commands.txt"
                  download="fleetshare-full-server-commands.txt"
                  className={downloadRowClass}
                >
                  <span className="min-w-0 text-left">
                    <span className="block font-semibold text-white text-sm font-mono break-all">
                      {t("landing.download.fullServerRowTxtFile")}
                    </span>
                    <span className="block text-xs mt-1" style={{ color: "rgba(255,255,255,0.45)" }}>
                      {t("landing.download.fullServerRowTxtFor")}
                    </span>
                  </span>
                  <span className="text-xs font-mono shrink-0" style={{ color: "rgba(255,255,255,0.35)" }}>
                    .txt
                  </span>
                </a>
              </li>
            </ul>

            <h3
              className="text-[11px] font-semibold uppercase tracking-wide mb-3"
              style={{ color: "rgba(255,255,255,0.38)" }}
            >
              {t("landing.download.fullServerAfterTitle")}
            </h3>
            <ul className="list-disc pl-5 text-sm space-y-2 mb-3" style={{ color: "rgba(255,255,255,0.55)" }}>
              <li>{t("landing.download.fullServerAfter1")}</li>
              <li>{t("landing.download.fullServerAfter2")}</li>
              <li>{t("landing.download.fullServerAfter3")}</li>
              <li>{t("landing.download.fullServerAfter4")}</li>
            </ul>
            <p className="text-xs leading-relaxed" style={{ color: "rgba(255,255,255,0.35)" }}>
              {t("landing.download.fullServerEnvHint")}
            </p>
          </section>

          <div
            className="rounded-2xl p-5 sm:p-6"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            <div className="flex items-start gap-3 mb-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                style={{
                  background: "rgba(245, 166, 35, 0.12)",
                  border: "1px solid rgba(245, 166, 35, 0.35)",
                }}
              >
                <Download className="w-5 h-5" style={{ color: COL.accent }} strokeWidth={1.6} />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-base font-semibold mb-2" style={{ color: COL.accent }}>
                  {t("landing.download.androidTitle")}
                </h2>
                <p className="text-sm leading-relaxed mb-2" style={{ color: "rgba(255,255,255,0.5)" }}>
                  {t("landing.download.androidBody")}
                </p>
                <p className="text-xs leading-relaxed mb-2" style={{ color: "rgba(255,255,255,0.35)" }}>
                  {t("landing.download.apkFileHint")}
                </p>
                <p className="text-xs leading-relaxed mb-4" style={{ color: "rgba(255,255,255,0.35)" }}>
                  {t("landing.download.apkInstallSteps")}
                </p>
                <a
                  href={androidHref}
                  {...(!isSameOriginApkPath(androidHref)
                    ? { target: "_blank", rel: "noopener noreferrer" }
                    : {})}
                  className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-xl text-white text-sm font-semibold bg-[#185fa5] hover:bg-[#1d4ed8] transition-colors"
                >
                  <Download className="w-4 h-4 shrink-0" strokeWidth={2} />
                  {t("landing.download.directCta")}
                </a>
              </div>
            </div>
          </div>

          <section
            id="ai-validator"
            className="rounded-2xl p-5 sm:p-6 scroll-mt-24"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            <p
              className="text-[11px] font-semibold uppercase tracking-wide mb-2"
              style={{ color: "rgba(255,255,255,0.38)" }}
            >
              {t("landing.download.aiValidatorSectionEyebrow")}
            </p>
            <div className="flex items-start gap-3 mb-4">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                style={{
                  background: "rgba(139, 92, 246, 0.18)",
                  border: "1px solid rgba(167, 139, 250, 0.35)",
                }}
              >
                <Sparkles className="w-5 h-5 text-violet-300" strokeWidth={1.6} aria-hidden />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-base font-semibold text-white mb-2">{t("landing.download.aiValidatorTitle")}</h2>
                <p className="text-sm leading-relaxed mb-2" style={{ color: "rgba(255,255,255,0.5)" }}>
                  {t("landing.download.aiValidatorIntro")}
                </p>
                <p className="text-xs leading-relaxed mb-3" style={{ color: "rgba(255,255,255,0.38)" }}>
                  {t("landing.download.aiValidatorDeepLink")}
                </p>
                <p className="text-xs mb-1" style={{ color: "rgba(255,255,255,0.4)" }}>
                  {t("landing.download.aiValidatorRepoIntro")}
                </p>
                <a
                  href={AI_VALIDATOR_REPO}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-semibold text-sky-400 hover:text-sky-300 hover:underline break-all"
                >
                  {AI_VALIDATOR_REPO.replace(/^https:\/\//, "")}
                </a>
              </div>
            </div>

            <h3
              className="text-[11px] font-semibold uppercase tracking-wide mb-2 flex items-center gap-2"
              style={{ color: "rgba(255,255,255,0.38)" }}
            >
              <Download className="w-4 h-4 shrink-0 opacity-80" aria-hidden />
              {t("landing.download.aiValidatorDownloadsTitle")}
            </h3>
            <p className="text-xs leading-relaxed mb-4" style={{ color: "rgba(255,255,255,0.4)" }}>
              {t("landing.download.aiValidatorDownloadsHint")}
            </p>

            <ul className="space-y-4 mb-6">
              <li>
                <a
                  href="/downloads/fleetshare-ai-validator-install.sh"
                  download="fleetshare-ai-validator-install.sh"
                  className={downloadRowClass}
                >
                  <span className="min-w-0 text-left">
                    <span className="block font-semibold text-white text-sm font-mono break-all">
                      {t("landing.download.aiValidatorRowShFile")}
                    </span>
                    <span className="block text-xs mt-1" style={{ color: "rgba(255,255,255,0.45)" }}>
                      {t("landing.download.aiValidatorRowShFor")}
                    </span>
                  </span>
                  <span className="text-xs font-mono shrink-0" style={{ color: "rgba(255,255,255,0.35)" }}>
                    .sh
                  </span>
                </a>
                <p className="text-xs mt-2 ml-1 leading-relaxed" style={{ color: "rgba(255,255,255,0.38)" }}>
                  {t("landing.download.aiValidatorRowShCode")}
                </p>
              </li>
              <li>
                <a
                  href="/downloads/fleetshare-ai-validator-install.ps1"
                  download="fleetshare-ai-validator-install.ps1"
                  className={downloadRowClass}
                >
                  <span className="min-w-0 text-left">
                    <span className="block font-semibold text-white text-sm font-mono break-all">
                      {t("landing.download.aiValidatorRowPsFile")}
                    </span>
                    <span className="block text-xs mt-1" style={{ color: "rgba(255,255,255,0.45)" }}>
                      {t("landing.download.aiValidatorRowPsFor")}
                    </span>
                  </span>
                  <span className="text-xs font-mono shrink-0" style={{ color: "rgba(255,255,255,0.35)" }}>
                    .ps1
                  </span>
                </a>
                <p className="text-xs mt-2 ml-1 leading-relaxed" style={{ color: "rgba(255,255,255,0.38)" }}>
                  {t("landing.download.aiValidatorRowPsCode")}
                </p>
              </li>
              <li>
                <a
                  href="/downloads/fleetshare-ai-validator-commands.txt"
                  download="fleetshare-ai-validator-commands.txt"
                  className={downloadRowClass}
                >
                  <span className="min-w-0 text-left">
                    <span className="block font-semibold text-white text-sm font-mono break-all">
                      {t("landing.download.aiValidatorRowTxtFile")}
                    </span>
                    <span className="block text-xs mt-1" style={{ color: "rgba(255,255,255,0.45)" }}>
                      {t("landing.download.aiValidatorRowTxtFor")}
                    </span>
                  </span>
                  <span className="text-xs font-mono shrink-0" style={{ color: "rgba(255,255,255,0.35)" }}>
                    .txt
                  </span>
                </a>
              </li>
            </ul>

            <h3
              className="text-[11px] font-semibold uppercase tracking-wide mb-3"
              style={{ color: "rgba(255,255,255,0.38)" }}
            >
              {t("landing.download.aiValidatorAfterTitle")}
            </h3>
            <ul className="list-disc pl-5 text-sm space-y-2 mb-4" style={{ color: "rgba(255,255,255,0.55)" }}>
              <li>{t("landing.download.aiValidatorAfter1")}</li>
              <li>{t("landing.download.aiValidatorAfter2")}</li>
              <li>{t("landing.download.aiValidatorAfter3")}</li>
              <li>{t("landing.download.aiValidatorAfter4")}</li>
            </ul>
            <p className="text-xs" style={{ color: "rgba(255,255,255,0.38)" }}>
              {t("landing.download.aiValidatorHealth")}{" "}
              <code className={codeClass}>curl http://localhost:8080/health</code>
            </p>
          </section>
        </section>
      </main>
    </div>
  );
}
