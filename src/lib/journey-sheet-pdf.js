/**
 * Romanian-style journey log (foaie de parcurs) — generated from reservation + release data.
 * Uses the shared branded PDF style (header, sections, footer) from pdf-report.js.
 */
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import {
  drawPdfHeader,
  finalizePdfFooters,
  addSectionTitle,
  checkPageBreak,
} from "./pdf-report";
import fs from "fs";
import path from "path";

const BLUE = [24, 95, 165];
const DARK = [30, 41, 59];
const GREY = [100, 116, 139];
const WHITE = [255, 255, 255];
const LIGHT = [241, 245, 249];
const GREEN_LIGHT = [240, 253, 244];
const ORANGE_LIGHT = [255, 247, 237];

function fmtDt(d) {
  if (!d) return "—";
  const x = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(x.getTime())) return "—";
  return x.toLocaleString("ro-RO", { dateStyle: "short", timeStyle: "short" });
}

function fmtDate(d) {
  if (!d) return "—";
  const x = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(x.getTime())) return "—";
  return x.toLocaleDateString("ro-RO");
}

function fmtDuration(from, to) {
  if (!from || !to) return "—";
  const a = from instanceof Date ? from : new Date(from);
  const b = to instanceof Date ? to : new Date(to);
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return "—";
  const diffMs = b.getTime() - a.getTime();
  if (diffMs < 0) return "—";
  const totalMin = Math.round(diffMs / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h === 0) return `${m} min`;
  return `${h} h ${m} min`;
}

function loadLogoDataUrl() {
  try {
    const logoPath = path.join(process.cwd(), "public", "icon-512.png");
    const buf = fs.readFileSync(logoPath);
    return `data:image/png;base64,${buf.toString("base64")}`;
  } catch {
    return null;
  }
}

function drawSignatureBox(doc, x, y, w, h, label) {
  doc.setDrawColor(180, 190, 205);
  doc.setLineWidth(0.4);
  doc.roundedRect(x, y, w, h, 2, 2);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...GREY);
  doc.text(label, x + w / 2, y + 6, { align: "center" });
  // dashed signature line
  doc.setDrawColor(160, 174, 192);
  doc.setLineWidth(0.3);
  const lineY = y + h - 8;
  doc.line(x + 6, lineY, x + w - 6, lineY);
  doc.setFontSize(7);
  doc.text("Semnătura", x + w / 2, y + h - 3, { align: "center" });
}

function drawInfoBadge(doc, x, y, label, value, bgColor) {
  const pageW = doc.internal.pageSize.getWidth();
  const w = (pageW - 28 - 4) / 2; // two-column layout
  doc.setFillColor(...bgColor);
  doc.roundedRect(x, y, w, 18, 2, 2, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(...GREY);
  doc.text(label.toUpperCase(), x + 6, y + 6);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...DARK);
  doc.text(String(value || "—"), x + 6, y + 14);
}

/**
 * @param {Object} p
 * @param {string} p.companyName
 * @param {string} p.driverName
 * @param {string} p.driverEmail
 * @param {string} p.vehicleLabel
 * @param {string} p.registrationNumber
 * @param {string} [p.purpose]
 * @param {Date|string} p.startDate       - scheduled start
 * @param {Date|string} p.endDate         - scheduled end
 * @param {Date|string} [p.pickedUpAt]    - actual pickup timestamp
 * @param {Date|string} [p.releasedAt]    - actual release timestamp
 * @param {number} [p.releasedKmUsed]
 * @param {number} [p.releasedOdometerStart]
 * @param {number} [p.releasedOdometerEnd]
 * @param {Date} [p.generatedAt]
 * @param {string} [p.reservationId]
 * @returns {Buffer}
 */
export function buildJourneySheetPdf(p) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const logoDataUrl = loadLogoDataUrl();

  const generatedOn = fmtDt(p.generatedAt || new Date());
  const hasActualTimes = !!(p.pickedUpAt || p.releasedAt);

  let y = drawPdfHeader(doc, {
    title: "Foaie de parcurs",
    subtitle: `${p.vehicleLabel || "—"} · ${p.registrationNumber || "—"}`,
    company: { name: p.companyName || "" },
    generatedOn: `Generat: ${generatedOn}`,
    logoDataUrl,
  });

  // ── Summary badges (2 cols) ──────────────────────────────────────────────────
  const colLeft = 14;
  const colRight = 14 + (pageW - 28 - 4) / 2 + 4;

  drawInfoBadge(doc, colLeft, y, "Conducător auto", p.driverName || "—", LIGHT);
  drawInfoBadge(doc, colRight, y, "Autovehicul", `${p.vehicleLabel || "—"} | ${p.registrationNumber || "—"}`, LIGHT);
  y += 22;

  drawInfoBadge(doc, colLeft, y, "Plecare efectivă", fmtDt(p.pickedUpAt || p.startDate), GREEN_LIGHT);
  drawInfoBadge(doc, colRight, y, "Returnare efectivă", fmtDt(p.releasedAt || p.endDate), ORANGE_LIGHT);
  y += 22;

  const duration = fmtDuration(p.pickedUpAt || p.startDate, p.releasedAt || p.endDate);
  const kmTotal = p.releasedKmUsed != null ? `${p.releasedKmUsed} km` : "—";
  drawInfoBadge(doc, colLeft, y, "Durată totală deplasare", duration, LIGHT);
  drawInfoBadge(doc, colRight, y, "Km parcurși", kmTotal, LIGHT);
  y += 26;

  // ── Section 1: Identificare ──────────────────────────────────────────────────
  y = checkPageBreak(doc, y, 60);
  y = addSectionTitle(doc, y, "1. Identificare vehicul și conducător");

  autoTable(doc, {
    startY: y,
    body: [
      ["Companie / operator", p.companyName || "—"],
      ["Conducător auto", p.driverName || "—"],
      ["Email conducător", p.driverEmail || "—"],
      ["Autovehicul", p.vehicleLabel || "—"],
      ["Nr. înmatriculare", p.registrationNumber || "—"],
      ["Scopul deplasării", p.purpose || "—"],
      ["ID rezervare", p.reservationId || "—"],
    ],
    theme: "plain",
    styles: {
      fontSize: 8.5,
      textColor: DARK,
      cellPadding: { top: 2.5, bottom: 2.5, left: 4, right: 4 },
    },
    columnStyles: {
      0: { fontStyle: "bold", textColor: GREY, cellWidth: 58 },
      1: { cellWidth: "auto" },
    },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    margin: { left: 14, right: 14, bottom: 20 },
  });
  y = doc.lastAutoTable.finalY + 8;

  // ── Section 2: Timpi planificați vs efectivi ─────────────────────────────────
  y = checkPageBreak(doc, y, 55);
  y = addSectionTitle(doc, y, "2. Perioadă de deplasare");

  const timeRows = [
    ["Plecare planificată", fmtDt(p.startDate), hasActualTimes ? fmtDt(p.pickedUpAt) : "—"],
    ["Returnare planificată", fmtDt(p.endDate), hasActualTimes ? fmtDt(p.releasedAt) : "—"],
    ["Durată planificată", fmtDuration(p.startDate, p.endDate), hasActualTimes ? fmtDuration(p.pickedUpAt, p.releasedAt) : "—"],
  ];

  autoTable(doc, {
    startY: y,
    head: [["Indicator", "Planificat", "Efectiv"]],
    body: timeRows,
    theme: "grid",
    headStyles: {
      fillColor: BLUE,
      textColor: WHITE,
      fontStyle: "bold",
      fontSize: 9,
      cellPadding: { top: 3, bottom: 3, left: 4, right: 4 },
    },
    bodyStyles: {
      fontSize: 8.5,
      textColor: DARK,
      cellPadding: { top: 2.5, bottom: 2.5, left: 4, right: 4 },
    },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: {
      0: { fontStyle: "bold", cellWidth: 55 },
      1: { cellWidth: 65 },
      2: { cellWidth: 65 },
    },
    margin: { left: 14, right: 14, bottom: 20 },
  });
  y = doc.lastAutoTable.finalY + 8;

  // ── Section 3: Kilometraj ────────────────────────────────────────────────────
  y = checkPageBreak(doc, y, 55);
  y = addSectionTitle(doc, y, "3. Kilometraj");

  autoTable(doc, {
    startY: y,
    head: [["Indicator", "Valoare"]],
    body: [
      ["Km la predare (citire odometru la plecare)", p.releasedOdometerStart != null ? `${p.releasedOdometerStart.toLocaleString("ro-RO")} km` : "—"],
      ["Km la returnare (citire odometru la sosire)", p.releasedOdometerEnd != null ? `${p.releasedOdometerEnd.toLocaleString("ro-RO")} km` : "—"],
      ["Km parcurși în această deplasare", p.releasedKmUsed != null ? `${p.releasedKmUsed.toLocaleString("ro-RO")} km` : "—"],
    ],
    theme: "grid",
    headStyles: {
      fillColor: BLUE,
      textColor: WHITE,
      fontStyle: "bold",
      fontSize: 9,
      cellPadding: { top: 3, bottom: 3, left: 4, right: 4 },
    },
    bodyStyles: {
      fontSize: 8.5,
      textColor: DARK,
      cellPadding: { top: 2.5, bottom: 2.5, left: 4, right: 4 },
    },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: { 0: { fontStyle: "bold", cellWidth: 100 } },
    margin: { left: 14, right: 14, bottom: 20 },
  });
  y = doc.lastAutoTable.finalY + 8;

  // ── Section 4: Semnături ─────────────────────────────────────────────────────
  y = checkPageBreak(doc, y, 50);
  y = addSectionTitle(doc, y, "4. Confirmare și semnături");

  const sigW = (pageW - 28 - 8) / 3;
  drawSignatureBox(doc, 14, y, sigW, 38, "Conducător auto");
  drawSignatureBox(doc, 14 + sigW + 4, y, sigW, 38, "Responsabil flotă");
  drawSignatureBox(doc, 14 + (sigW + 4) * 2, y, sigW, 38, "Verificat / Aprobat");
  y += 44;

  // ── Disclaimer ───────────────────────────────────────────────────────────────
  y = checkPageBreak(doc, y, 25);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, y, pageW - 28, 22, 2, 2, "F");
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.3);
  doc.roundedRect(14, y, pageW - 28, 22, 2, 2);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(...DARK);
  doc.text("Notă:", 18, y + 6);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...GREY);
  doc.text(
    `Perioadă rezervare: ${fmtDate(p.startDate)} – ${fmtDate(p.endDate)}. Timpii efectivi de preluare și returnare sunt înregistrați automat de sistem la momentul acționării butoanelor corespunzătoare din aplicație. Acest document nu înlocuiește monitorizarea GPS. Datele provin din sistemul de rezervări FleetShare. Păstrați acest document pentru justificarea cheltuielilor conform legislației fiscale în vigoare.`,
    18,
    y + 11,
    { maxWidth: pageW - 36 },
  );

  finalizePdfFooters(doc, p.companyName || "");

  const buf = doc.output("arraybuffer");
  return Buffer.from(buf);
}
