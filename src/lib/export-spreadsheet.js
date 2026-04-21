/**
 * Fleet management Excel/CSV export.
 *
 * NOTE: We intentionally avoid the `xlsx` (SheetJS) package due to unresolved
 * security advisories. This implementation uses `exceljs` for .xlsx export and
 * a simple CSV generator for reservations.
 */
import ExcelJS from "exceljs";

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function fmtDate(raw) {
  if (!raw) return "";
  try { return new Date(raw).toLocaleString("en-GB", { dateStyle: "short", timeStyle: "short" }); }
  catch { return String(raw); }
}

function fmtDateOnly(raw) {
  if (!raw) return "";
  try { return new Date(raw).toLocaleDateString("en-GB", { dateStyle: "short" }); }
  catch { return String(raw); }
}

function monthKey(raw) {
  if (!raw) return "";
  try { const d = new Date(raw); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`; }
  catch { return ""; }
}

function carLabel(car) {
  if (!car) return "—";
  return [[car.brand, car.model].filter(Boolean).join(" ").trim(), car.registrationNumber].filter(Boolean).join(" · ");
}

function userLabel(user) {
  if (!user) return "—";
  return user.name || user.email || "—";
}

/**
 * Estimates fuel cost for one reservation.
 * Returns 0 if company prices are not configured.
 */
function calcFuelCost(r, car, company) {
  const km = r.releasedKmUsed ?? 0;
  if (km <= 0 || !car || !company) return 0;
  const ft = car.fuelType ?? "Benzine";
  const l100 = car.averageConsumptionL100km ?? company.defaultConsumptionL100km ?? 7.5;
  const kwh100 = car.averageConsumptionKwh100km ?? 20;
  const pB = company.priceBenzinePerLiter ?? company.averageFuelPricePerLiter ?? 0;
  const pD = company.priceDieselPerLiter ?? company.averageFuelPricePerLiter ?? 0;
  const pH = company.priceHybridPerLiter ?? pB ?? 0;
  const pE = company.priceElectricityPerKwh ?? 0;
  if (ft === "Electric") return (km / 100) * kwh100 * pE;
  if (ft === "Hybrid") return (km / 100) * l100 * pH + (km / 100) * kwh100 * pE;
  return (km / 100) * l100 * (ft === "Diesel" ? pD : pB);
}

function buildReservationsRows(reservations, users, cars) {
  const userMap = Object.fromEntries((users || []).map((u) => [u.id || u.userId, u]));
  const carMap  = Object.fromEntries((cars  || []).map((c) => [c.id, c]));

  const header = [
    "Reservation ID", "Status", "Driver", "Email",
    "Vehicle", "Plate", "Fuel Type",
    "Planned Start", "Planned End",
    "Actual Pickup", "Actual Release",
    "Duration (h)", "KM Used", "Purpose",
  ];

  const rows = (reservations || []).map((r) => {
    const u  = userMap[r.userId  || r.user?.id];
    const c  = carMap [r.carId   || r.car?.id];
    const start   = r.pickedUpAt  || r.startDate;
    const end     = r.releasedAt  || r.endDate;
    const durH    = (start && end)
      ? ((new Date(end) - new Date(start)) / 3_600_000).toFixed(2)
      : "";
    return [
      r.id, r.status,
      userLabel(u), u?.email || "",
      carLabel(c), c?.registrationNumber || "",
      c?.fuelType || "",
      fmtDate(r.startDate), fmtDate(r.endDate),
      fmtDate(r.pickedUpAt), fmtDate(r.releasedAt),
      durH,
      r.releasedKmUsed ?? "",
      r.purpose || "",
    ];
  });

  return { header, rows };
}

function buildKmByCarRows(reservations, cars) {
  const carMap = Object.fromEntries((cars || []).map((c) => [c.id, c]));

  // Collect all months present in data
  const monthSet = new Set();
  for (const r of reservations || []) {
    if (r.releasedKmUsed > 0) monthSet.add(monthKey(r.releasedAt || r.updatedAt));
  }
  const months = [...monthSet].filter(Boolean).sort();

  // Group km by carId + month
  const byCarMonth = {};
  for (const r of reservations || []) {
    if (!r.releasedKmUsed) continue;
    const cid  = r.carId || r.car?.id || "?";
    const mon  = monthKey(r.releasedAt || r.updatedAt);
    if (!mon) continue;
    if (!byCarMonth[cid]) byCarMonth[cid] = {};
    byCarMonth[cid][mon] = (byCarMonth[cid][mon] || 0) + r.releasedKmUsed;
  }

  const header = ["Vehicle", "Plate", "Fuel Type", "Total KM", ...months];
  const rows = Object.entries(byCarMonth).map(([cid, mmap]) => {
    const c = carMap[cid];
    const total = Object.values(mmap).reduce((s, v) => s + v, 0);
    return [carLabel(c), c?.registrationNumber || "", c?.fuelType || "", total, ...months.map((m) => mmap[m] ?? 0)];
  }).sort((a, b) => (b[3] ?? 0) - (a[3] ?? 0));

  return { header, rows };
}

function buildFuelCostsRows(reservations, cars, company) {
  const carMap = Object.fromEntries((cars || []).map((c) => [c.id, c]));

  const header = [
    "Reservation ID", "Date", "Vehicle", "Plate", "Fuel Type",
    "KM Used", "Consumption (L or kWh / 100km)", "Est. Fuel Cost",
  ];

  const rows = (reservations || [])
    .filter((r) => (r.releasedKmUsed ?? 0) > 0)
    .map((r) => {
      const c    = carMap[r.carId || r.car?.id];
      const cost = calcFuelCost(r, c, company);
      const l100 = c?.averageConsumptionL100km ?? company?.defaultConsumptionL100km ?? 7.5;
      const kwh  = c?.averageConsumptionKwh100km ?? 20;
      const cons = c?.fuelType === "Electric"
        ? `${kwh} kWh/100km`
        : c?.fuelType === "Hybrid"
        ? `${l100} L + ${kwh} kWh/100km`
        : `${l100} L/100km`;
      return [
        r.id,
        fmtDate(r.releasedAt || r.updatedAt),
        carLabel(c), c?.registrationNumber || "", c?.fuelType || "",
        r.releasedKmUsed ?? 0,
        cons,
        Number(cost.toFixed(2)),
      ];
    });

  return { header, rows };
}

function buildMaintenanceRows(maintenanceEvents, cars) {
  const carMap = Object.fromEntries((cars || []).map((c) => [c.id, c]));

  const header = [
    "ID", "Vehicle", "Plate", "Service Type", "Date",
    "Odometer (km)", "Cost", "Notes",
  ];

  const rows = (maintenanceEvents || []).map((e) => {
    const c = carMap[e.carId];
    return [
      e.id || "",
      carLabel(c), c?.registrationNumber || "",
      e.serviceType || e.type || "",
      fmtDateOnly(e.performedAt || e.date),
      e.mileage ?? e.odometer ?? "",
      e.cost ?? "",
      e.notes || e.description || "",
    ];
  });

  return { header, rows };
}

function addSheet(wb, name, { header, rows }) {
  const ws = wb.addWorksheet(name);

  ws.addRow(header);
  ws.getRow(1).font = { bold: true };

  for (const r of rows) ws.addRow(r);

  // Simple auto-width
  ws.columns.forEach((col) => {
    let max = 10;
    col.eachCell({ includeEmpty: true }, (cell) => {
      const v = cell?.value;
      const len = v == null ? 0 : String(v).length;
      if (len > max) max = len;
    });
    col.width = Math.min(max + 2, 40);
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Triggers a browser download of a multi-sheet Excel (.xlsx) file.
 *
 * @param {{ reservations, maintenanceEvents, cars, users, company, companyName? }} params
 */
export async function downloadFleetExcel({ reservations, maintenanceEvents, cars, users, company, companyName }) {
  const wb = new ExcelJS.Workbook();
  wb.creator = "FleetShare";
  wb.created = new Date();

  addSheet(wb, "Reservations", buildReservationsRows(reservations, users, cars));
  addSheet(wb, "Km by Car", buildKmByCarRows(reservations, cars));
  addSheet(wb, "Fuel Costs", buildFuelCostsRows(reservations, cars, company));
  addSheet(wb, "Maintenance", buildMaintenanceRows(maintenanceEvents, cars));

  const safeCompany = (companyName || "fleet").replace(/[^\w\s-]/g, "").replace(/\s+/g, "-").toLowerCase();
  const date        = new Date().toISOString().slice(0, 10);

  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `fleet-export-${safeCompany}-${date}.xlsx`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function csvEscape(s) {
  const v = String(s ?? "");
  if (/[",\n]/.test(v)) return `"${v.replace(/"/g, "\"\"")}"`;
  return v;
}

/**
 * Triggers a browser download of a CSV file (reservations only).
 *
 * @param {{ reservations, users, cars }} params
 */
export function downloadFleetCsv({ reservations, users, cars, companyName }) {
  const { header, rows } = buildReservationsRows(reservations, users, cars);
  const csv = [header, ...rows]
    .map((r) => r.map(csvEscape).join(","))
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  const safeCompany = (companyName || "fleet").replace(/[^\w\s-]/g, "").replace(/\s+/g, "-").toLowerCase();
  a.download = `reservations-${safeCompany}-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
