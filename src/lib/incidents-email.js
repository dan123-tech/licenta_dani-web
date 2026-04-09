import { getTenantPrisma } from "@/lib/tenant-db";
import { escapeEmailText, sendEmail, wrapBrandedEmailHtml } from "@/lib/email";
import { incidentAttachmentUrlForApi } from "@/lib/incident-ref";

function formatOccurred(d) {
  try {
    return new Date(d).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return "—";
  }
}

export async function sendIncidentAdminEmail(companyId, { incidentId }) {
  const tenant = await getTenantPrisma(companyId);
  const company = await tenant.company.findUnique({ where: { id: companyId }, select: { name: true } });
  const incident = await tenant.incidentReport.findFirst({
    where: { id: incidentId, companyId },
    include: {
      car: { select: { brand: true, model: true, registrationNumber: true } },
      user: { select: { name: true, email: true } },
      attachments: true,
    },
  });
  if (!incident) return { ok: false, error: "not_found" };

  const admins = await tenant.companyMember.findMany({
    where: { companyId, role: "ADMIN", status: "ENROLLED" },
    include: { user: { select: { email: true } } },
  });
  const to = admins.map((a) => a.user?.email).filter(Boolean);
  if (!to.length) return { ok: false, error: "no_admins" };

  const carLabel =
    [incident.car?.brand, incident.car?.model, incident.car?.registrationNumber].filter(Boolean).join(" ") || "—";
  const driverLabel = incident.user?.name
    ? `${incident.user.name}${incident.user.email ? ` (${incident.user.email})` : ""}`
    : incident.user?.email || "—";
  const occurred = formatOccurred(incident.occurredAt);

  const attachments = (incident.attachments || []).map((a) => ({
    id: a.id,
    filename: a.filename,
    contentType: a.contentType,
    sizeBytes: a.sizeBytes,
    url: incidentAttachmentUrlForApi(a.blobUrl, a.id),
  }));

  const subject = `New incident report — ${company?.name || companyId}`;
  const text = [
    `New incident report — ${company?.name || companyId}`,
    "",
    `Title: ${incident.title || "—"}`,
    `Occurred: ${occurred}`,
    `Car: ${carLabel}`,
    `Driver: ${driverLabel}`,
    incident.location ? `Location: ${incident.location}` : null,
    incident.description ? `Description:\n${incident.description}` : null,
    "",
    `Incident ID: ${incident.id}`,
    `Attachments: ${attachments.length}`,
    ...attachments.map((a) => `- ${a.filename} (${a.sizeBytes} bytes)`),
  ]
    .filter(Boolean)
    .join("\n");

  const listHtml = attachments.length
    ? `<ul style="margin:8px 0 0;padding-left:18px;">${attachments
        .map(
          (a) =>
            `<li style="margin:0 0 8px;"><a href="${escapeEmailText(a.url)}" style="color:#0369a1;text-decoration:none;font-weight:700;">${escapeEmailText(
              a.filename
            )}</a> <span style="color:#64748b;font-size:12px;">(${escapeEmailText(String(a.contentType || ""))}, ${escapeEmailText(
              String(a.sizeBytes)
            )} bytes)</span></li>`
        )
        .join("")}</ul>`
    : `<p style="margin:0;color:#64748b;font-size:14px;">No attachments.</p>`;

  const innerHtml = `
    <p style="margin:0 0 10px;font-size:18px;font-weight:800;color:#0f172a;">New incident report</p>
    <div style="margin:0 0 14px;padding:12px 14px;background:#f1f5f9;border:1px solid #e2e8f0;border-radius:12px;">
      <p style="margin:0 0 6px;"><strong style="color:#0f172a;">Company:</strong> ${escapeEmailText(company?.name || companyId)}</p>
      <p style="margin:0 0 6px;"><strong style="color:#0f172a;">Title:</strong> ${escapeEmailText(incident.title || "—")}</p>
      <p style="margin:0 0 6px;"><strong style="color:#0f172a;">Occurred:</strong> ${escapeEmailText(occurred)}</p>
      <p style="margin:0 0 6px;"><strong style="color:#0f172a;">Car:</strong> ${escapeEmailText(carLabel)}</p>
      <p style="margin:0;"><strong style="color:#0f172a;">Driver:</strong> ${escapeEmailText(driverLabel)}</p>
    </div>
    ${
      incident.location
        ? `<p style="margin:0 0 8px;"><strong style="color:#0f172a;">Location:</strong> ${escapeEmailText(incident.location)}</p>`
        : ""
    }
    ${
      incident.description
        ? `<p style="margin:0 0 12px;"><strong style="color:#0f172a;">Description:</strong><br />${escapeEmailText(incident.description).replace(/\n/g, "<br />")}</p>`
        : ""
    }
    <p style="margin:0 0 8px;"><strong style="color:#0f172a;">Attachments</strong></p>
    ${listHtml}
    <p style="margin:14px 0 0;color:#64748b;font-size:12px;">Incident ID: ${escapeEmailText(incident.id)}</p>
  `.trim();

  const html = wrapBrandedEmailHtml({
    innerHtml,
    preheader: `New incident: ${incident.title || "Incident"} — ${carLabel}`,
  });

  return sendEmail({ to, subject, html, text });
}

