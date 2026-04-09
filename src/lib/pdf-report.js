/**
 * Shared PDF report utilities — branded headers, footers, and report generators.
 * All generators return void (they trigger a browser download via doc.save).
 */
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

// ─── Brand colours ────────────────────────────────────────────────────────────
const BLUE = [24, 95, 165];      // #185FA5
const DARK = [30, 41, 59];       // slate-800
const GREY = [100, 116, 139];    // slate-500
const LIGHT = [241, 245, 249];   // slate-100
const WHITE = [255, 255, 255];
const HEADER_H = 28; // mm

// ─── Auto-table shared style ──────────────────────────────────────────────────
const HEAD_STYLE = {
  fillColor: BLUE,
  textColor: WHITE,
  fontStyle: "bold",
  fontSize: 9,
  cellPadding: { top: 3, bottom: 3, left: 4, right: 4 },
};
const BODY_STYLE = {
  fontSize: 8.5,
  textColor: DARK,
  cellPadding: { top: 2.5, bottom: 2.5, left: 4, right: 4 },
};
const ALT_STYLE = { fillColor: [248, 250, 252] };
const TBL_MARGIN = { left: 14, right: 14, bottom: 20 };

// ─── Logo loader ──────────────────────────────────────────────────────────────
export async function fetchLogoDataUrl() {
  try {
    const res = await fetch("/icon-512.png");
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

// ─── Header ──────────────────────────────────────────────────────────────────
/**
 * Draws the branded header on the current page.
 * @returns {number} Y position right after the header (ready for content).
 */
export function drawPdfHeader(doc, { title, subtitle, company, generatedOn, logoDataUrl }) {
  const pageW = doc.internal.pageSize.getWidth();

  // Blue background
  doc.setFillColor(...BLUE);
  doc.rect(0, 0, pageW, HEADER_H, "F");

  // Logo
  let textX = 14;
  if (logoDataUrl) {
    try {
      doc.addImage(logoDataUrl, "PNG", 9, 5, 17, 17);
      textX = 31;
    } catch {
      /* skip logo if it fails */
    }
  }

  // Title
  doc.setTextColor(...WHITE);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.text(title, textX, 13);

  // Subtitle
  if (subtitle) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(subtitle, textX, 21);
  }

  // Right side: company + generated date
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  if (company?.name) {
    doc.text(company.name, pageW - 12, 10, { align: "right" });
  }
  if (generatedOn) {
    doc.text(generatedOn, pageW - 12, 17, { align: "right" });
  }

  // Reset
  doc.setTextColor(...DARK);

  // Thin divider below header
  doc.setDrawColor(200, 210, 220);
  doc.setLineWidth(0.3);
  doc.line(14, HEADER_H + 2, pageW - 14, HEADER_H + 2);

  return HEADER_H + 7;
}

// ─── Footer (applied to all pages after content is complete) ─────────────────
export function finalizePdfFooters(doc, companyName) {
  const total = doc.internal.getNumberOfPages();
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();

  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    doc.setDrawColor(200, 210, 220);
    doc.setLineWidth(0.3);
    doc.line(14, pageH - 14, pageW - 14, pageH - 14);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...GREY);
    const left = companyName ? `FleetShare · ${companyName}` : "FleetShare";
    doc.text(left, 14, pageH - 8);
    doc.text(`Page ${i} / ${total}`, pageW - 14, pageH - 8, { align: "right" });
  }
  doc.setTextColor(...DARK);
}

// ─── Section title block ──────────────────────────────────────────────────────
export function addSectionTitle(doc, y, title) {
  const pageW = doc.internal.pageSize.getWidth();
  doc.setFillColor(...LIGHT);
  doc.roundedRect(14, y - 1, pageW - 28, 8, 1.5, 1.5, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...DARK);
  doc.text(title, 18, y + 4.8);
  doc.setTextColor(...DARK);
  return y + 13;
}

// ─── Page-break helper ────────────────────────────────────────────────────────
export function checkPageBreak(doc, y, needed = 40) {
  const pageH = doc.internal.pageSize.getHeight();
  if (y + needed > pageH - 20) {
    doc.addPage();
    return 20;
  }
  return y;
}

// ─── Key-value detail block ───────────────────────────────────────────────────
function addDetailRow(doc, y, label, value) {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(...GREY);
  doc.text(label, 16, y);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...DARK);
  doc.text(String(value ?? "—"), 70, y);
  return y + 6;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function carLabel(car) {
  return [car?.brand, car?.model].filter(Boolean).join(" ").trim() || car?.brand || "Vehicle";
}

function carFullLabel(car) {
  const bm = carLabel(car);
  const plate = car?.registrationNumber ? ` (${car.registrationNumber})` : "";
  return `${bm}${plate}`;
}

function locStr(locale) {
  return locale === "ro" ? "ro-RO" : "en-GB";
}

function fmtNum(n, locale) {
  return typeof n === "number" ? n.toLocaleString(locStr(locale)) : "—";
}

// ─── 1. Per-Car Report ────────────────────────────────────────────────────────
/**
 * Full history for a single car: reservations + maintenance + incidents.
 */
export async function generateCarReport(car, reservations, maintenanceEvents, incidents, {
  company, locale = "en", formatCurrency, formatDate,
}) {
  if (!car) return;
  const logo = await fetchLogoDataUrl();
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const ls = locStr(locale);

  const generatedOn = new Date().toLocaleString(ls, { dateStyle: "short", timeStyle: "short" });
  let y = drawPdfHeader(doc, {
    title: "Vehicle Report",
    subtitle: carFullLabel(car),
    company,
    generatedOn: `Generated: ${generatedOn}`,
    logoDataUrl: logo,
  });

  // ── Car details ──
  y = addSectionTitle(doc, y, "Vehicle Details");
  y = addDetailRow(doc, y, "Registration", car.registrationNumber);
  y = addDetailRow(doc, y, "Brand / Model", carLabel(car));
  y = addDetailRow(doc, y, "Fuel Type", car.fuelType ?? "Benzine");
  y = addDetailRow(doc, y, "Current Odometer", car.km != null ? `${fmtNum(car.km, locale)} km` : "—");
  y = addDetailRow(doc, y, "Last Service At", car.lastServiceMileage != null ? `${fmtNum(car.lastServiceMileage, locale)} km` : "—");
  y = addDetailRow(doc, y, "Status", car.status ?? "—");
  if (car.itpExpiresAt) {
    y = addDetailRow(doc, y, "ITP Expires", formatDate ? formatDate(car.itpExpiresAt) : new Date(car.itpExpiresAt).toLocaleDateString(ls));
  }
  y += 4;

  // ── Summary stats ──
  const totalKm = reservations.reduce((s, r) => s + (r.releasedKmUsed ?? 0), 0);
  const totalCost = reservations.reduce((s, r) => {
    // Simple sum if we have an estimated cost field; otherwise just sum km
    return s;
  }, 0);
  const maintCostSum = maintenanceEvents.reduce((s, e) => {
    const c = e.cost != null && !isNaN(Number(e.cost)) ? Number(e.cost) : 0;
    return s + c;
  }, 0);
  const maintWithCost = maintenanceEvents.filter((e) => e.cost != null && !isNaN(Number(e.cost)));

  y = checkPageBreak(doc, y, 35);
  y = addSectionTitle(doc, y, "Summary");

  autoTable(doc, {
    startY: y,
    head: [["Metric", "Value"]],
    body: [
      ["Total Reservations", String(reservations.length)],
      ["Total Km Driven", `${fmtNum(totalKm, locale)} km`],
      ["Maintenance Records", String(maintenanceEvents.length)],
      ...(maintWithCost.length > 0
        ? [["Total Maintenance Cost", formatCurrency ? formatCurrency(maintCostSum) : `${maintCostSum.toFixed(2)}`]]
        : []),
      ["Incidents", String(incidents.length)],
    ],
    theme: "grid",
    headStyles: HEAD_STYLE,
    bodyStyles: BODY_STYLE,
    alternateRowStyles: ALT_STYLE,
    margin: TBL_MARGIN,
    columnStyles: { 0: { fontStyle: "bold", cellWidth: 70 } },
  });
  y = doc.lastAutoTable.finalY + 10;

  // ── Reservations ──
  y = checkPageBreak(doc, y, 30);
  y = addSectionTitle(doc, y, `Reservations (${reservations.length})`);

  if (reservations.length > 0) {
    autoTable(doc, {
      startY: y,
      head: [["Date", "Driver", "Km Used", "Status", "Purpose"]],
      body: reservations.map((r) => [
        formatDate ? formatDate(r.startDate) : new Date(r.startDate ?? 0).toLocaleDateString(ls),
        r.user?.name || r.user?.email || "—",
        r.releasedKmUsed != null ? `${fmtNum(r.releasedKmUsed, locale)} km` : "—",
        (r.status ?? "—").toLowerCase(),
        (r.purpose ?? "—").slice(0, 40),
      ]),
      theme: "grid",
      headStyles: HEAD_STYLE,
      bodyStyles: BODY_STYLE,
      alternateRowStyles: ALT_STYLE,
      margin: TBL_MARGIN,
    });
    y = doc.lastAutoTable.finalY + 10;
  } else {
    doc.setFontSize(8.5);
    doc.setTextColor(...GREY);
    doc.text("No reservations found.", 16, y);
    doc.setTextColor(...DARK);
    y += 10;
  }

  // ── Maintenance ──
  y = checkPageBreak(doc, y, 30);
  y = addSectionTitle(doc, y, `Maintenance History (${maintenanceEvents.length})`);

  if (maintenanceEvents.length > 0) {
    autoTable(doc, {
      startY: y,
      head: [["Date", "Service Type", "Odometer", "Cost", "Notes"]],
      body: maintenanceEvents.map((e) => [
        formatDate ? formatDate(e.performedAt) : new Date(e.performedAt ?? 0).toLocaleDateString(ls),
        e.serviceType ?? "—",
        e.mileageKm != null ? `${fmtNum(e.mileageKm, locale)} km` : "—",
        e.cost != null && !isNaN(Number(e.cost))
          ? (formatCurrency ? formatCurrency(Number(e.cost)) : Number(e.cost).toFixed(2))
          : "—",
        (e.notes ?? "").slice(0, 60),
      ]),
      theme: "grid",
      headStyles: HEAD_STYLE,
      bodyStyles: BODY_STYLE,
      alternateRowStyles: ALT_STYLE,
      margin: TBL_MARGIN,
    });
    y = doc.lastAutoTable.finalY + 10;
  } else {
    doc.setFontSize(8.5);
    doc.setTextColor(...GREY);
    doc.text("No maintenance records found.", 16, y);
    doc.setTextColor(...DARK);
    y += 10;
  }

  // ── Incidents ──
  y = checkPageBreak(doc, y, 30);
  y = addSectionTitle(doc, y, `Incidents (${incidents.length})`);

  if (incidents.length > 0) {
    autoTable(doc, {
      startY: y,
      head: [["Date", "Driver", "Severity", "Status", "Description"]],
      body: incidents.map((r) => [
        formatDate ? formatDate(r.occurredAt ?? r.createdAt) : new Date(r.occurredAt ?? r.createdAt ?? 0).toLocaleDateString(ls),
        r.user?.name || r.user?.email || "—",
        (r.severity ?? "C").toUpperCase(),
        r.status ?? "SUBMITTED",
        (r.description ?? "—").slice(0, 60),
      ]),
      theme: "grid",
      headStyles: HEAD_STYLE,
      bodyStyles: BODY_STYLE,
      alternateRowStyles: ALT_STYLE,
      margin: TBL_MARGIN,
    });
  } else {
    doc.setFontSize(8.5);
    doc.setTextColor(...GREY);
    doc.text("No incidents found.", 16, y);
    doc.setTextColor(...DARK);
  }

  finalizePdfFooters(doc, company?.name);
  const plate = (car.registrationNumber ?? "car").replace(/[^a-zA-Z0-9]/g, "-");
  doc.save(`vehicle-report-${plate}-${new Date().toISOString().slice(0, 10)}.pdf`);
}

// ─── 2. Per-Car + Period Report ────────────────────────────────────────────────
export async function generateCarPeriodReport(car, reservations, maintenanceEvents, {
  company, locale = "en", formatCurrency, formatDate, dateFrom, dateTo,
}) {
  if (!car) return;
  const logo = await fetchLogoDataUrl();
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const ls = locStr(locale);

  const generatedOn = new Date().toLocaleString(ls, { dateStyle: "short", timeStyle: "short" });
  const periodLabel = [dateFrom, dateTo].filter(Boolean).join(" → ") || "All time";

  let y = drawPdfHeader(doc, {
    title: "Vehicle Period Report",
    subtitle: `${carFullLabel(car)} · ${periodLabel}`,
    company,
    generatedOn: `Generated: ${generatedOn}`,
    logoDataUrl: logo,
  });

  // ── Car details ──
  y = addSectionTitle(doc, y, "Vehicle Details");
  y = addDetailRow(doc, y, "Registration", car.registrationNumber);
  y = addDetailRow(doc, y, "Brand / Model", carLabel(car));
  y = addDetailRow(doc, y, "Fuel Type", car.fuelType ?? "Benzine");
  y = addDetailRow(doc, y, "Period", periodLabel);
  y += 4;

  // ── Period summary ──
  const totalKm = reservations.reduce((s, r) => s + (r.releasedKmUsed ?? 0), 0);
  const maintCostSum = maintenanceEvents.reduce((s, e) => {
    const c = e.cost != null && !isNaN(Number(e.cost)) ? Number(e.cost) : 0;
    return s + c;
  }, 0);

  y = checkPageBreak(doc, y, 30);
  y = addSectionTitle(doc, y, "Period Summary");

  autoTable(doc, {
    startY: y,
    head: [["Metric", "Value"]],
    body: [
      ["Reservations in Period", String(reservations.length)],
      ["Km Driven in Period", `${fmtNum(totalKm, locale)} km`],
      ["Maintenance Events in Period", String(maintenanceEvents.length)],
      ...(maintCostSum > 0
        ? [["Maintenance Cost in Period", formatCurrency ? formatCurrency(maintCostSum) : `${maintCostSum.toFixed(2)}`]]
        : []),
    ],
    theme: "grid",
    headStyles: HEAD_STYLE,
    bodyStyles: BODY_STYLE,
    alternateRowStyles: ALT_STYLE,
    margin: TBL_MARGIN,
    columnStyles: { 0: { fontStyle: "bold", cellWidth: 70 } },
  });
  y = doc.lastAutoTable.finalY + 10;

  // ── Reservations ──
  y = checkPageBreak(doc, y, 30);
  y = addSectionTitle(doc, y, `Reservations (${reservations.length})`);

  if (reservations.length > 0) {
    autoTable(doc, {
      startY: y,
      head: [["Start Date", "End Date", "Driver", "Km Used", "Status", "Purpose"]],
      body: reservations.map((r) => [
        formatDate ? formatDate(r.startDate) : new Date(r.startDate ?? 0).toLocaleDateString(ls),
        formatDate ? formatDate(r.endDate) : (r.endDate ? new Date(r.endDate).toLocaleDateString(ls) : "—"),
        r.user?.name || r.user?.email || "—",
        r.releasedKmUsed != null ? `${fmtNum(r.releasedKmUsed, locale)} km` : "—",
        (r.status ?? "—").toLowerCase(),
        (r.purpose ?? "—").slice(0, 30),
      ]),
      theme: "grid",
      headStyles: HEAD_STYLE,
      bodyStyles: BODY_STYLE,
      alternateRowStyles: ALT_STYLE,
      margin: TBL_MARGIN,
    });
    y = doc.lastAutoTable.finalY + 10;
  } else {
    doc.setFontSize(8.5);
    doc.setTextColor(...GREY);
    doc.text("No reservations in this period.", 16, y);
    doc.setTextColor(...DARK);
    y += 10;
  }

  // ── Maintenance ──
  y = checkPageBreak(doc, y, 30);
  y = addSectionTitle(doc, y, `Maintenance in Period (${maintenanceEvents.length})`);

  if (maintenanceEvents.length > 0) {
    autoTable(doc, {
      startY: y,
      head: [["Date", "Service Type", "Odometer", "Cost", "Notes"]],
      body: maintenanceEvents.map((e) => [
        formatDate ? formatDate(e.performedAt) : new Date(e.performedAt ?? 0).toLocaleDateString(ls),
        e.serviceType ?? "—",
        e.mileageKm != null ? `${fmtNum(e.mileageKm, locale)} km` : "—",
        e.cost != null && !isNaN(Number(e.cost))
          ? (formatCurrency ? formatCurrency(Number(e.cost)) : Number(e.cost).toFixed(2))
          : "—",
        (e.notes ?? "").slice(0, 60),
      ]),
      theme: "grid",
      headStyles: HEAD_STYLE,
      bodyStyles: BODY_STYLE,
      alternateRowStyles: ALT_STYLE,
      margin: TBL_MARGIN,
    });
  } else {
    doc.setFontSize(8.5);
    doc.setTextColor(...GREY);
    doc.text("No maintenance records in this period.", 16, y);
    doc.setTextColor(...DARK);
  }

  finalizePdfFooters(doc, company?.name);
  const plate = (car.registrationNumber ?? "car").replace(/[^a-zA-Z0-9]/g, "-");
  doc.save(`vehicle-period-${plate}-${new Date().toISOString().slice(0, 10)}.pdf`);
}

// ─── 3. Per-Car Maintenance Report ───────────────────────────────────────────
export async function generateCarMaintenanceReport(car, maintenanceEvents, {
  company, locale = "en", formatCurrency, formatDate,
}) {
  if (!car) return;
  const logo = await fetchLogoDataUrl();
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const ls = locStr(locale);

  const generatedOn = new Date().toLocaleString(ls, { dateStyle: "short", timeStyle: "short" });
  let y = drawPdfHeader(doc, {
    title: "Maintenance Report",
    subtitle: carFullLabel(car),
    company,
    generatedOn: `Generated: ${generatedOn}`,
    logoDataUrl: logo,
  });

  // ── Car details ──
  y = addSectionTitle(doc, y, "Vehicle Details");
  y = addDetailRow(doc, y, "Registration", car.registrationNumber);
  y = addDetailRow(doc, y, "Brand / Model", carLabel(car));
  y = addDetailRow(doc, y, "Fuel Type", car.fuelType ?? "Benzine");
  y = addDetailRow(doc, y, "Current Odometer", car.km != null ? `${fmtNum(car.km, locale)} km` : "—");
  y = addDetailRow(doc, y, "Last Service At", car.lastServiceMileage != null ? `${fmtNum(car.lastServiceMileage, locale)} km` : "—");
  y += 4;

  // ── Maintenance summary ──
  const totalCost = maintenanceEvents.reduce((s, e) => {
    const c = e.cost != null && !isNaN(Number(e.cost)) ? Number(e.cost) : 0;
    return s + c;
  }, 0);
  const withCost = maintenanceEvents.filter((e) => e.cost != null && !isNaN(Number(e.cost)));
  const avgCost = withCost.length > 0 ? totalCost / withCost.length : 0;

  y = checkPageBreak(doc, y, 30);
  y = addSectionTitle(doc, y, "Summary");

  autoTable(doc, {
    startY: y,
    head: [["Metric", "Value"]],
    body: [
      ["Total Service Records", String(maintenanceEvents.length)],
      ...(withCost.length > 0
        ? [
            ["Total Cost", formatCurrency ? formatCurrency(totalCost) : totalCost.toFixed(2)],
            ["Average Cost per Record", formatCurrency ? formatCurrency(avgCost) : avgCost.toFixed(2)],
            ["Records with Cost", `${withCost.length} / ${maintenanceEvents.length}`],
          ]
        : []),
    ],
    theme: "grid",
    headStyles: HEAD_STYLE,
    bodyStyles: BODY_STYLE,
    alternateRowStyles: ALT_STYLE,
    margin: TBL_MARGIN,
    columnStyles: { 0: { fontStyle: "bold", cellWidth: 70 } },
  });
  y = doc.lastAutoTable.finalY + 10;

  // ── All records ──
  y = checkPageBreak(doc, y, 30);
  y = addSectionTitle(doc, y, `Service Records (${maintenanceEvents.length})`);

  if (maintenanceEvents.length > 0) {
    autoTable(doc, {
      startY: y,
      head: [["Date", "Service Type", "Odometer", "Cost", "Notes"]],
      body: maintenanceEvents
        .slice()
        .sort((a, b) => new Date(b.performedAt) - new Date(a.performedAt))
        .map((e) => [
          formatDate ? formatDate(e.performedAt) : new Date(e.performedAt ?? 0).toLocaleDateString(ls),
          e.serviceType ?? "—",
          e.mileageKm != null ? `${fmtNum(e.mileageKm, locale)} km` : "—",
          e.cost != null && !isNaN(Number(e.cost))
            ? (formatCurrency ? formatCurrency(Number(e.cost)) : Number(e.cost).toFixed(2))
            : "—",
          (e.notes ?? "").slice(0, 70),
        ]),
      theme: "grid",
      headStyles: HEAD_STYLE,
      bodyStyles: BODY_STYLE,
      alternateRowStyles: ALT_STYLE,
      margin: TBL_MARGIN,
    });
  } else {
    doc.setFontSize(8.5);
    doc.setTextColor(...GREY);
    doc.text("No maintenance records found for this vehicle.", 16, y);
    doc.setTextColor(...DARK);
  }

  finalizePdfFooters(doc, company?.name);
  const plate = (car.registrationNumber ?? "car").replace(/[^a-zA-Z0-9]/g, "-");
  doc.save(`maintenance-${plate}-${new Date().toISOString().slice(0, 10)}.pdf`);
}

// ─── 4. Complete Fleet Report ─────────────────────────────────────────────────
export async function generateCompleteFleetReport({
  cars, reservations, maintenanceEvents, incidents, users,
  company, locale = "en", formatCurrency, formatDate,
}) {
  const logo = await fetchLogoDataUrl();
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const ls = locStr(locale);

  const generatedOn = new Date().toLocaleString(ls, { dateStyle: "short", timeStyle: "short" });
  let y = drawPdfHeader(doc, {
    title: "Complete Fleet Report",
    subtitle: `${cars.length} vehicles · ${reservations.length} reservations`,
    company,
    generatedOn: `Generated: ${generatedOn}`,
    logoDataUrl: logo,
  });

  // ── Fleet overview ──
  const totalKm = reservations
    .filter((r) => (r.status || "").toLowerCase() === "completed")
    .reduce((s, r) => s + (r.releasedKmUsed ?? 0), 0);
  const activeRes = reservations.filter((r) => (r.status || "").toLowerCase() === "active");
  const totalMaintCost = maintenanceEvents.reduce((s, e) => {
    const c = e.cost != null && !isNaN(Number(e.cost)) ? Number(e.cost) : 0;
    return s + c;
  }, 0);

  y = addSectionTitle(doc, y, "Fleet Overview");

  autoTable(doc, {
    startY: y,
    head: [["Metric", "Value"]],
    body: [
      ["Total Vehicles", String(cars.length)],
      ["Active Reservations", String(activeRes.length)],
      ["Total Reservations (all time)", String(reservations.length)],
      ["Total Km Driven (completed trips)", `${fmtNum(totalKm, locale)} km`],
      ["Total Maintenance Records", String(maintenanceEvents.length)],
      ...(totalMaintCost > 0
        ? [["Total Maintenance Cost", formatCurrency ? formatCurrency(totalMaintCost) : totalMaintCost.toFixed(2)]]
        : []),
      ["Total Incidents", String(incidents.length)],
      ["Total Users", String(users.length)],
    ],
    theme: "grid",
    headStyles: HEAD_STYLE,
    bodyStyles: BODY_STYLE,
    alternateRowStyles: ALT_STYLE,
    margin: TBL_MARGIN,
    columnStyles: { 0: { fontStyle: "bold", cellWidth: 80 } },
  });
  y = doc.lastAutoTable.finalY + 10;

  // ── Per-car summary ──
  y = checkPageBreak(doc, y, 30);
  y = addSectionTitle(doc, y, "Vehicles Overview");

  autoTable(doc, {
    startY: y,
    head: [["Vehicle", "Plate", "Fuel", "Odometer", "Reservations", "Km Driven", "Maintenance"]],
    body: cars.map((car) => {
      const carRes = reservations.filter((r) => (r.carId || r.car?.id) === car.id);
      const carKm = carRes
        .filter((r) => (r.status || "").toLowerCase() === "completed")
        .reduce((s, r) => s + (r.releasedKmUsed ?? 0), 0);
      const carMaint = maintenanceEvents.filter((e) => e.carId === car.id);
      return [
        carLabel(car),
        car.registrationNumber ?? "—",
        car.fuelType ?? "Benzine",
        car.km != null ? `${fmtNum(car.km, locale)} km` : "—",
        String(carRes.length),
        `${fmtNum(carKm, locale)} km`,
        String(carMaint.length),
      ];
    }),
    theme: "grid",
    headStyles: HEAD_STYLE,
    bodyStyles: BODY_STYLE,
    alternateRowStyles: ALT_STYLE,
    margin: TBL_MARGIN,
  });
  y = doc.lastAutoTable.finalY + 10;

  // ── Top users ──
  y = checkPageBreak(doc, y, 30);
  y = addSectionTitle(doc, y, "Top Drivers (by Reservation Count)");

  const byUser = {};
  reservations.forEach((r) => {
    const uid = r.userId || r.user?.id;
    if (uid) byUser[uid] = (byUser[uid] || 0) + 1;
  });
  const topUsers = Object.entries(byUser)
    .map(([uid, count]) => {
      const u = users.find((m) => m.userId === uid || m.id === uid);
      return { name: u?.name || "—", email: u?.email || "—", count };
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, 15);

  autoTable(doc, {
    startY: y,
    head: [["#", "Name", "Email", "Reservations"]],
    body: topUsers.map((u, i) => [String(i + 1), u.name, u.email, String(u.count)]),
    theme: "grid",
    headStyles: HEAD_STYLE,
    bodyStyles: BODY_STYLE,
    alternateRowStyles: ALT_STYLE,
    margin: TBL_MARGIN,
    columnStyles: { 0: { cellWidth: 12 }, 3: { cellWidth: 28 } },
  });
  y = doc.lastAutoTable.finalY + 10;

  // ── Maintenance summary per vehicle ──
  y = checkPageBreak(doc, y, 30);
  y = addSectionTitle(doc, y, "Maintenance Summary by Vehicle");

  const maintByCar = {};
  maintenanceEvents.forEach((e) => {
    const key = e.carId;
    if (!maintByCar[key]) maintByCar[key] = { count: 0, totalCost: 0, withCost: 0 };
    maintByCar[key].count += 1;
    const c = e.cost != null && !isNaN(Number(e.cost)) ? Number(e.cost) : null;
    if (c != null) { maintByCar[key].totalCost += c; maintByCar[key].withCost += 1; }
  });

  const maintRows = cars
    .map((car) => {
      const m = maintByCar[car.id] || { count: 0, totalCost: 0, withCost: 0 };
      return [
        carLabel(car),
        car.registrationNumber ?? "—",
        String(m.count),
        m.withCost > 0 ? (formatCurrency ? formatCurrency(m.totalCost) : m.totalCost.toFixed(2)) : "—",
      ];
    })
    .filter((r) => r[2] !== "0")
    .sort((a, b) => Number(b[2]) - Number(a[2]));

  if (maintRows.length > 0) {
    autoTable(doc, {
      startY: y,
      head: [["Vehicle", "Plate", "Service Count", "Total Cost"]],
      body: maintRows,
      theme: "grid",
      headStyles: HEAD_STYLE,
      bodyStyles: BODY_STYLE,
      alternateRowStyles: ALT_STYLE,
      margin: TBL_MARGIN,
    });
    y = doc.lastAutoTable.finalY + 10;
  } else {
    doc.setFontSize(8.5);
    doc.setTextColor(...GREY);
    doc.text("No maintenance records.", 16, y);
    doc.setTextColor(...DARK);
    y += 10;
  }

  // ── Incidents summary ──
  y = checkPageBreak(doc, y, 30);
  y = addSectionTitle(doc, y, `Incidents Summary (${incidents.length})`);

  if (incidents.length > 0) {
    const sevCount = { A: 0, B: 0, C: 0 };
    const statusCount = {};
    incidents.forEach((r) => {
      const sev = (r.severity ?? "C").toUpperCase();
      sevCount[sev] = (sevCount[sev] ?? 0) + 1;
      const st = r.status ?? "SUBMITTED";
      statusCount[st] = (statusCount[st] ?? 0) + 1;
    });

    autoTable(doc, {
      startY: y,
      head: [["Category", "Count"]],
      body: [
        ["Severity A (Critical)", String(sevCount.A)],
        ["Severity B (Medium)", String(sevCount.B)],
        ["Severity C (Low)", String(sevCount.C)],
        ...Object.entries(statusCount).map(([st, c]) => [`Status: ${st}`, String(c)]),
      ],
      theme: "grid",
      headStyles: HEAD_STYLE,
      bodyStyles: BODY_STYLE,
      alternateRowStyles: ALT_STYLE,
      margin: TBL_MARGIN,
      columnStyles: { 0: { fontStyle: "bold", cellWidth: 80 } },
    });
    y = doc.lastAutoTable.finalY + 10;

    y = checkPageBreak(doc, y, 30);
    autoTable(doc, {
      startY: y,
      head: [["Date", "Vehicle", "Driver", "Sev.", "Status", "Description"]],
      body: incidents.slice(0, 100).map((r) => [
        formatDate ? formatDate(r.occurredAt ?? r.createdAt) : new Date(r.occurredAt ?? r.createdAt ?? 0).toLocaleDateString(ls),
        [r.car?.brand, r.car?.registrationNumber].filter(Boolean).join(" ") || "—",
        r.user?.name || r.user?.email || "—",
        (r.severity ?? "C").toUpperCase(),
        r.status ?? "SUBMITTED",
        (r.description ?? "—").slice(0, 50),
      ]),
      theme: "grid",
      headStyles: HEAD_STYLE,
      bodyStyles: BODY_STYLE,
      alternateRowStyles: ALT_STYLE,
      margin: TBL_MARGIN,
    });
  } else {
    doc.setFontSize(8.5);
    doc.setTextColor(...GREY);
    doc.text("No incidents recorded.", 16, y);
    doc.setTextColor(...DARK);
  }

  finalizePdfFooters(doc, company?.name);
  doc.save(`fleet-complete-report-${new Date().toISOString().slice(0, 10)}.pdf`);
}
