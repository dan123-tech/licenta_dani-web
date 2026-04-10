/**
 * GET /api/compliance-alerts?windowDays=30
 * Admin: cars with ITP, RCA, or vignette expiring within N days (or already expired).
 */
import { requireAdmin, jsonResponse, errorResponse, dataSourceNotConfiguredResponse } from "@/lib/api-helpers";
import { getProvider, LAYERS, PROVIDERS } from "@/lib/data-source-manager";
import { getTenantPrisma } from "@/lib/tenant-db";

function dayStart(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function daysBetweenCalendar(a, b) {
  return Math.ceil((dayStart(a).getTime() - dayStart(b).getTime()) / (24 * 60 * 60 * 1000));
}

export async function GET(request) {
  const out = await requireAdmin();
  if ("response" in out) return out.response;

  let provider;
  try {
    provider = await getProvider(out.session.companyId, LAYERS.CARS);
  } catch (err) {
    return errorResponse(err?.message || "Failed to verify data source", 500);
  }
  if (provider !== PROVIDERS.LOCAL) {
    return dataSourceNotConfiguredResponse(LAYERS.CARS, "Compliance alerts require the built-in cars data source.");
  }

  const { searchParams } = new URL(request.url);
  const windowDays = Math.min(365, Math.max(1, parseInt(searchParams.get("windowDays") || "30", 10) || 30));

  const today = dayStart(new Date());
  const cutoff = new Date(today.getTime() + windowDays * 24 * 60 * 60 * 1000);

  const tenant = await getTenantPrisma(out.session.companyId);
  const cars = await tenant.car.findMany({
    where: { companyId: out.session.companyId },
    select: {
      id: true,
      brand: true,
      model: true,
      registrationNumber: true,
      status: true,
      itpExpiresAt: true,
      rcaExpiresAt: true,
      vignetteExpiresAt: true,
    },
    orderBy: { registrationNumber: "asc" },
  });

  const mapRow = (car, field, dateVal) => {
    if (!dateVal) return null;
    const exp = new Date(dateVal);
    if (Number.isNaN(exp.getTime())) return null;
    if (exp.getTime() > cutoff.getTime()) return null;
    return {
      carId: car.id,
      label: [car.brand, car.model, car.registrationNumber].filter(Boolean).join(" "),
      registrationNumber: car.registrationNumber,
      status: car.status,
      expiresAt: exp.toISOString(),
      daysUntil: daysBetweenCalendar(exp, today),
      kind: field,
    };
  };

  const itp = [];
  const rca = [];
  const vignette = [];
  for (const car of cars) {
    const i = mapRow(car, "itp", car.itpExpiresAt);
    if (i) itp.push(i);
    const r = mapRow(car, "rca", car.rcaExpiresAt);
    if (r) rca.push(r);
    const v = mapRow(car, "vignette", car.vignetteExpiresAt);
    if (v) vignette.push(v);
  }

  itp.sort((a, b) => new Date(a.expiresAt) - new Date(b.expiresAt));
  rca.sort((a, b) => new Date(a.expiresAt) - new Date(b.expiresAt));
  vignette.sort((a, b) => new Date(a.expiresAt) - new Date(b.expiresAt));

  return jsonResponse({
    windowDays,
    generatedAt: new Date().toISOString(),
    itp,
    rca,
    vignette,
    cronHints: {
      itp: "/api/cron/itp-expiry-reminders",
      rca: "/api/cron/rca-expiry-reminders",
      vignette: "/api/cron/vignette-expiry-reminders",
    },
  });
}
