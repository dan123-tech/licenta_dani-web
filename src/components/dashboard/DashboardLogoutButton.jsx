"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { apiLogout } from "@/lib/api";
import { useI18n } from "@/i18n/I18nProvider";

/**
 * @param {{ mobileOnly?: boolean }} props
 *   mobileOnly=true (default): show only below md — desktop keeps logout in sidebar.
 *   mobileOnly=false: always show (e.g. no-company gate screen).
 */
export default function DashboardLogoutButton({ mobileOnly = true }) {
  const router = useRouter();
  const { t } = useI18n();

  async function handleLogout() {
    await apiLogout();
    router.push("/login");
    router.refresh();
  }

  const visibility = mobileOnly ? "md:hidden" : "";

  return (
    <button
      type="button"
      onClick={handleLogout}
      className={`inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 sm:px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm min-h-[44px] hover:bg-slate-50 hover:border-slate-300 transition-colors shrink-0 ${visibility}`}
      aria-label={t("sidebar.logout")}
    >
      <LogOut className="w-4 h-4 shrink-0" strokeWidth={2} aria-hidden />
      <span>{t("sidebar.logout")}</span>
    </button>
  );
}
