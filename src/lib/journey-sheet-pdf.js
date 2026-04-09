/**
 * Romanian-style journey log (foaie de parcurs) — generated from reservation + release data.
 * Not a substitute for legally mandated paper forms where applicable; supports deductibility documentation.
 */
import { jsPDF } from "jspdf";

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

/**
 * @param {Object} p
 * @returns {Buffer}
 */
export function buildJourneySheetPdf(p) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 14;
  let y = margin;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("Foaie de parcurs (extras electronic)", margin, y);
  y += 8;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(60, 60, 60);
  doc.text(
    "Document generat automat din sistemul de rezervări. Păstrați acest fișier pentru justificarea cheltuielilor (conform legislației fiscale în vigoare).",
    margin,
    y,
    { maxWidth: pageW - margin * 2 }
  );
  y += 12;

  doc.setDrawColor(220, 220, 220);
  doc.line(margin, y, pageW - margin, y);
  y += 6;

  const rows = [
    ["Companie / operator", p.companyName || "—"],
    ["Conducător auto", p.driverName || "—"],
    ["Email conducător", p.driverEmail || "—"],
    ["Autovehicul", p.vehicleLabel || "—"],
    ["Număr înmatriculare", p.registrationNumber || "—"],
    ["Scop deplasare", p.purpose || "—"],
    ["Data/ora început rezervare", fmtDt(p.startDate)],
    ["Data/ora sfârșit rezervare (planificat)", fmtDt(p.endDate)],
    ["Kilometraj la predare (plecare)", p.releasedOdometerStart != null ? `${p.releasedOdometerStart} km` : "—"],
    ["Kilometraj la returnare (sosire)", p.releasedOdometerEnd != null ? `${p.releasedOdometerEnd} km` : "—"],
    ["Kilometri parcurși (înregistrat)", p.releasedKmUsed != null ? `${p.releasedKmUsed} km` : "—"],
    ["Generat la", fmtDt(p.generatedAt)],
    ["ID rezervare", p.reservationId || "—"],
  ];

  doc.setFontSize(10);
  for (const [label, value] of rows) {
    if (y > 270) {
      doc.addPage();
      y = margin;
    }
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 41, 59);
    doc.text(`${label}:`, margin, y);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(51, 65, 85);
    const lines = doc.splitTextToSize(String(value), pageW - margin * 2 - 52);
    doc.text(lines, margin + 50, y);
    y += Math.max(6, lines.length * 5);
  }

  y += 4;
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(
    `Rezumat perioadă: ${fmtDate(p.startDate)} – ${fmtDate(p.endDate)}. Acest document nu înlocuiește monitorizarea GPS; datele provin din rezervare și din citirea odometrului la returnare.`,
    margin,
    y,
    { maxWidth: pageW - margin * 2 }
  );

  const buf = doc.output("arraybuffer");
  return Buffer.from(buf);
}
