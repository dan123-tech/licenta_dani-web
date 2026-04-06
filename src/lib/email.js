/**
 * Transactional email from a no-reply style address.
 *
 * Uses Resend’s REST API (no extra package): https://resend.com
 * 1. Create API key, verify your domain (SPF/DKIM handled by Resend).
 * 2. Set RESEND_API_KEY, EMAIL_FROM (e.g. no-reply@yourdomain.com), optional EMAIL_FROM_NAME.
 *
 * Alternative: use Nodemailer + SMTP (Gmail, SendGrid SMTP, etc.) if you prefer one SMTP_URL.
 */

const RESEND_API = "https://api.resend.com/emails";

function fromAddress() {
  const name = (process.env.EMAIL_FROM_NAME || "FleetShare").trim();
  const email = (process.env.EMAIL_FROM || "").trim();
  if (!email) return null;
  return `${name} <${email}>`;
}

/**
 * @param {{ to: string | string[], subject: string, html?: string, text?: string, replyTo?: string }} opts
 * @returns {Promise<{ ok: boolean, id?: string, error?: string }>}
 */
export async function sendEmail({ to, subject, html, text, replyTo }) {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = fromAddress();

  if (!apiKey || !from) {
    return { ok: false, error: "not_configured" };
  }

  const toList = Array.isArray(to) ? to : [to];

  const body = {
    from,
    to: toList,
    subject,
    ...(html ? { html } : {}),
    ...(text ? { text } : {}),
    ...(replyTo ? { reply_to: replyTo } : {}),
  };

  if (!body.html && !body.text) {
    return { ok: false, error: "missing_body" };
  }

  const res = await fetch(RESEND_API, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const msg = data?.message || data?.error || res.statusText || "send_failed";
    return { ok: false, error: String(msg) };
  }

  const id = data?.id;
  return { ok: true, id };
}

/**
 * Invite email with optional join link (set NEXT_PUBLIC_APP_URL for a full URL).
 */
export async function sendInviteEmail({ to, token, inviteeName }) {
  const base = (process.env.NEXT_PUBLIC_APP_URL || "").replace(/\/$/, "");
  const link = base
    ? `${base}/register?invite=${encodeURIComponent(token)}`
    : null;

  const greeting = inviteeName ? `Hi ${inviteeName},` : "Hi,";

  const text = [
    greeting,
    "",
    "You’ve been invited to join the company on FleetShare.",
    link ? `Open this link to accept and set your password:\n${link}` : `Your invite token (paste where the app asks for it):\n${token}`,
    "",
    "If you didn’t expect this, you can ignore this email.",
  ].join("\n");

  const html = `
    <p>${greeting}</p>
    <p>You’ve been invited to join the company on <strong>FleetShare</strong>.</p>
    ${
      link
        ? `<p><a href="${link}">Accept invitation and set password</a></p>`
        : `<p>Your invite token:</p><pre style="font-size:14px;word-break:break-all">${token}</pre>`
    }
    <p style="color:#64748b;font-size:13px">If you didn’t expect this, you can ignore this email.</p>
  `.trim();

  return sendEmail({ to, subject: "You’re invited to FleetShare", html, text });
}

/**
 * Sent after self-service registration.
 */
export async function sendWelcomeEmail({ to, name }) {
  const greeting = name?.trim() ? `Hi ${name.trim()},` : "Hi,";
  const text = [
    greeting,
    "",
    "Your FleetShare account is ready. Sign in with the email you used to register.",
    "",
    "Optional: after you log in, you can turn on email sign-in codes (MFA) under Dashboard → Security.",
    "",
    "If you didn’t create this account, you can ignore this email.",
  ].join("\n");
  const html = `
    <p>${greeting}</p>
    <p>Your <strong>FleetShare</strong> account is ready. Sign in with the email you used to register.</p>
    <p style="color:#64748b;font-size:14px">Optional: after you log in, you can enable email sign-in codes (MFA) under <strong>Dashboard → Security</strong>.</p>
    <p style="color:#64748b;font-size:13px">If you didn’t create this account, you can ignore this email.</p>
  `.trim();
  return sendEmail({ to, subject: "Welcome to FleetShare", html, text });
}

/**
 * Sent when an admin creates a user account with a password the admin chose.
 * Does not include the password. User must change it on first login (app enforces).
 */
export async function sendAdminCreatedAccountEmail({ to, name }) {
  const base = (process.env.NEXT_PUBLIC_APP_URL || "").replace(/\/$/, "");
  const signInLink = base ? `${base}/login` : null;
  const greeting = name?.trim() ? `Hi ${name.trim()},` : "Hi,";
  const text = [
    greeting,
    "",
    "An administrator created a FleetShare account for you.",
    "Sign in with the email address this message was sent to and the password your administrator gave you.",
    "On first sign-in you will be asked to choose a new password before using the app.",
    "",
    signInLink ? `Sign in: ${signInLink}` : "Open FleetShare and go to the sign-in page.",
    "",
    "If you didn’t expect this, contact your company administrator.",
  ].join("\n");
  const html = `
    <p>${greeting}</p>
    <p>An administrator created a <strong>FleetShare</strong> account for you.</p>
    <p>Sign in with <strong>this email address</strong> and the <strong>password your administrator gave you</strong>. After you sign in, you will be prompted to <strong>choose your own password</strong> before continuing.</p>
    ${
      signInLink
        ? `<p><a href="${signInLink}" style="display:inline-block;padding:10px 18px;background:#2563eb;color:#fff;text-decoration:none;border-radius:8px;font-weight:600">Sign in to FleetShare</a></p>`
        : ""
    }
    <p style="color:#64748b;font-size:13px">If you didn’t expect this, contact your company administrator.</p>
  `.trim();
  return sendEmail({ to, subject: "Your FleetShare account is ready — set your password", html, text });
}

function formatReservationWhen(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return String(iso);
  }
}

/**
 * Sent when a user creates a reservation (local DB). Includes pickup window and codes when present.
 */
export async function sendReservationConfirmationEmail({ to, name, reservation }) {
  const greeting = name?.trim() ? `Hi ${name.trim()},` : "Hi,";
  const car = reservation?.car;
  const carLabel = car
    ? [car.brand, car.model, car.registrationNumber].filter(Boolean).join(" ").trim() || reservation.carId
    : reservation?.carId || "—";
  const pickup = reservation?.pickup_code ?? "—";
  const release = reservation?.release_code ?? "— (shown in the app when you return the vehicle)";
  const validFrom = formatReservationWhen(reservation?.code_valid_from ?? reservation?.startDate);
  const start = formatReservationWhen(reservation?.startDate);
  const end = formatReservationWhen(reservation?.endDate);
  const purpose = reservation?.purpose?.trim() || "—";

  const text = [
    greeting,
    "",
    "Your reservation is confirmed.",
    "",
    `Vehicle: ${carLabel}`,
    `Start: ${start}`,
    `End: ${end}`,
    `Purpose: ${purpose}`,
    "",
    `Pickup code: ${pickup}`,
    `Code valid from: ${validFrom}`,
    `Release code: ${release}`,
    "",
    "Keep this email for reference, or open FleetShare to see live details.",
  ].join("\n");

  const html = `
    <p>${greeting}</p>
    <p>Your reservation is <strong>confirmed</strong>.</p>
    <table style="border-collapse:collapse;font-size:14px;margin:12px 0">
      <tr><td style="padding:4px 12px 4px 0;color:#64748b">Vehicle</td><td><strong>${carLabel}</strong></td></tr>
      <tr><td style="padding:4px 12px 4px 0;color:#64748b">Start</td><td>${start}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;color:#64748b">End</td><td>${end}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;color:#64748b">Purpose</td><td>${purpose}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;color:#64748b">Pickup code</td><td><strong style="font-size:18px;letter-spacing:2px">${pickup}</strong></td></tr>
      <tr><td style="padding:4px 12px 4px 0;color:#64748b">Code valid from</td><td>${validFrom}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;color:#64748b">Release code</td><td>${release}</td></tr>
    </table>
    <p style="color:#64748b;font-size:13px">You can also open FleetShare for live details.</p>
  `.trim();

  return sendEmail({ to, subject: "Reservation confirmed — FleetShare", html, text });
}

/**
 * 6-digit code after password when MFA is enabled.
 */
export async function sendMfaLoginCodeEmail({ to, code }) {
  const text = [
    "Your FleetShare sign-in code is:",
    "",
    String(code),
    "",
    "It expires in 10 minutes. If you didn’t try to sign in, ignore this email.",
  ].join("\n");
  const html = `
    <p>Your FleetShare sign-in code is:</p>
    <p style="font-size:28px;font-weight:700;letter-spacing:6px;font-family:ui-monospace,monospace">${String(code)}</p>
    <p style="color:#64748b;font-size:13px">It expires in 10 minutes. If you didn’t try to sign in, ignore this email.</p>
  `.trim();
  return sendEmail({ to, subject: "Your FleetShare sign-in code", html, text });
}
