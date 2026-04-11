import { NextResponse } from "next/server";
import { sendEmail, escapeEmailText } from "@/lib/email";

const LIMITS = { firstName: 80, lastName: 80, email: 254, message: 4000 };

function isValidEmail(s) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(s).trim());
}

/**
 * POST /api/contact — public contact form (Resend).
 */
export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const firstName = String(body?.firstName ?? "").trim();
  const lastName = String(body?.lastName ?? "").trim();
  const email = String(body?.email ?? "").trim();
  const message = String(body?.message ?? "").trim();

  if (!firstName || !lastName || !email || !message) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }
  if (firstName.length > LIMITS.firstName || lastName.length > LIMITS.lastName) {
    return NextResponse.json({ error: "name_too_long" }, { status: 400 });
  }
  if (email.length > LIMITS.email || !isValidEmail(email)) {
    return NextResponse.json({ error: "invalid_email" }, { status: 400 });
  }
  if (message.length > LIMITS.message) {
    return NextResponse.json({ error: "message_too_long" }, { status: 400 });
  }

  const to = process.env.CONTACT_FORM_TO?.trim();
  if (!to) {
    return NextResponse.json({ error: "inbox_not_configured" }, { status: 503 });
  }

  const subject = `[FleetShare contact] ${firstName} ${lastName}`;
  const html = `
    <p><strong>Name:</strong> ${escapeEmailText(firstName)} ${escapeEmailText(lastName)}</p>
    <p><strong>Email:</strong> ${escapeEmailText(email)}</p>
    <p><strong>Message:</strong></p>
    <p style="white-space:pre-wrap;">${escapeEmailText(message)}</p>
  `;
  const text = `Name: ${firstName} ${lastName}\nEmail: ${email}\n\n${message}`;

  const sent = await sendEmail({
    to,
    subject,
    html,
    text,
    replyTo: email,
  });

  if (!sent.ok) {
    if (sent.error === "not_configured") {
      return NextResponse.json({ error: "email_not_configured" }, { status: 503 });
    }
    return NextResponse.json({ error: "send_failed" }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
