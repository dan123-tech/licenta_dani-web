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
  addDetailRow,
  checkPageBreak,
} from "./pdf-report";
import fs from "fs";
import path from "path";

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

function loadLogoDataUrl() {
  try {
    const logoPath = path.join(process.cwd(), "public", "icon-512.png");
    const buf = fs.readFileSync(logoPath);
    return `data:image/png;base64,${buf.toString("base64")}`;
  } catch {
    return null;
  }
}

/**
 * @param {Object} p
 * @returns {Buffer}
 */
export function buildJourneySheetPdf(p) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const logoDataUrl = loadLogoDataUrl();

  const generatedOn = fmtDt(p.generatedAt || new Date());

  let y = drawPdfHeader(doc, {
    title: "Foaie de parcurs",
    subtitle: `${p.vehicleLabel || "—"} · ${p.registrationNumber || "—"}`,
    company: { name: p.companyName || "" },
    generatedOn: `Generat: ${generatedOn}`,
    logoDataUrl,
  });

  // ── Trip details ──
  y = addSectionTitle(doc, y, "Detalii deplasare");
  y = addDetailRow(doc, y, "Companie / operator", p.companyName || "—");
  y = addDetailRow(doc, y, "Conducător auto", p.driverName || "—");
  y = addDetailRow(doc, y, "Email conducător", p.driverEmail || "—");
  y = addDetailRow(doc, y, "Autovehicul", p.vehicleLabel || "—");
  y = addDetailRow(doc, y, "Nr. înmatriculare", p.registrationNumber || "—");
  y = addDetailRow(doc, y, "Scop deplasare", p.purpose || "—");
  y += 4;

  // ── Reservation period ──
  y = checkPageBreak(doc, y, 40);
  y = addSectionTitle(doc, y, "Perioadă rezervare");
  y = addDetailRow(doc, y, "Început (data/ora)", fmtDt(p.startDate));
  y = addDetailRow(doc, y, "Sfârșit planificat", fmtDt(p.endDate));
  y += 4;

  // ── Odometer / km ──
  y = checkPageBreak(doc, y, 40);
  y = addSectionTitle(doc, y, "Kilometraj");

  const odometerRows = [
    ["Km la predare (plecare)", p.releasedOdometerStart != null ? `${p.releasedOdometerStart} km` : "—"],
    ["Km la returnare (sosire)", p.releasedOdometerEnd != null ? `${p.releasedOdometerEnd} km` : "—"],
    ["Km parcurși", p.releasedKmUsed != null ? `${p.releasedKmUsed} km` : "—"],
  ];

  autoTable(doc, {
    startY: y,
    head: [["Indicator", "Valoare"]],
    body: odometerRows,
    theme: "grid",
    headStyles: {
      fillColor: [24, 95, 165],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 9,
      cellPadding: { top: 3, bottom: 3, left: 4, right: 4 },
    },
    bodyStyles: {
      fontSize: 8.5,
      textColor: [30, 41, 59],
      cellPadding: { top: 2.5, bottom: 2.5, left: 4, right: 4 },
    },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    margin: { left: 14, right: 14, bottom: 20 },
    columnStyles: { 0: { fontStyle: "bold", cellWidth: 70 } },
  });
  y = doc.lastAutoTable.finalY + 10;

  // ── Reservation metadata ──
  y = checkPageBreak(doc, y, 30);
  y = addSectionTitle(doc, y, "Metadate");
  y = addDetailRow(doc, y, "ID rezervare", p.reservationId || "—");
  y = addDetailRow(doc, y, "Generat la", fmtDt(p.generatedAt));
  y += 6;

  // ── Disclaimer ──
  y = checkPageBreak(doc, y, 20);
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text(
    `Rezumat perioadă: ${fmtDate(p.startDate)} – ${fmtDate(p.endDate)}. Acest document nu înlocuiește monitorizarea GPS; datele provin din rezervare și din citirea odometrului la returnare. Document generat automat din sistemul de rezervări — păstrați acest fișier pentru justificarea cheltuielilor (conform legislației fiscale în vigoare).`,
    14,
    y,
    { maxWidth: pageW - 28 },
  );

  finalizePdfFooters(doc, p.companyName || "");

  const buf = doc.output("arraybuffer");
  return Buffer.from(buf);
}
