import { randomBytes } from "crypto";
import { prisma } from "@/lib/db";

const DEFAULT_TTL_MINUTES = 15;
const DEFAULT_RATE_LIMIT_WINDOW_MINUTES = 5;
const DEFAULT_RATE_LIMIT_MAX = 3;

function envInt(name, fallback) {
  const raw = process.env[name];
  if (!raw) return fallback;
  const n = Number.parseInt(String(raw), 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export function buildMobileCaptureUrl(token, requestUrl) {
  const base =
    (process.env.NEXT_PUBLIC_APP_URL || "").trim().replace(/\/$/, "") ||
    String(requestUrl || "").trim().replace(/\/api\/.*$/, "").replace(/\/$/, "");
  return `${base}/identity/mobile-capture?token=${encodeURIComponent(token)}`;
}

export async function assertMobileSessionRateLimit(userId) {
  const windowMins = envInt("MOBILE_CAPTURE_RATE_LIMIT_WINDOW_MINUTES", DEFAULT_RATE_LIMIT_WINDOW_MINUTES);
  const maxSessions = envInt("MOBILE_CAPTURE_RATE_LIMIT_MAX", DEFAULT_RATE_LIMIT_MAX);
  const since = new Date(Date.now() - windowMins * 60 * 1000);
  const count = await prisma.mobileCaptureSession.count({
    where: {
      userId,
      createdAt: { gte: since },
    },
  });
  if (count >= maxSessions) {
    throw new Error(`Too many verification links created. Please wait ${windowMins} minutes and try again.`);
  }
}

export async function createMobileCaptureSession({
  userId,
  companyId,
  ipAddress,
  userAgent,
}) {
  const ttlMinutes = envInt("MOBILE_CAPTURE_SESSION_TTL_MINUTES", DEFAULT_TTL_MINUTES);
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);
  return prisma.mobileCaptureSession.create({
    data: {
      token,
      userId,
      companyId,
      expiresAt,
      status: "PENDING",
      ipAddress: ipAddress || null,
      userAgent: userAgent || null,
    },
  });
}

export async function getMobileCaptureSessionByToken(token) {
  return prisma.mobileCaptureSession.findUnique({
    where: { token },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true,
          drivingLicenceUrl: true,
        },
      },
      company: {
        select: { id: true, name: true },
      },
    },
  });
}

export async function markMobileCaptureSessionEmailSent(id) {
  return prisma.mobileCaptureSession.update({
    where: { id },
    data: { emailSentAt: new Date() },
  });
}

export async function markMobileCaptureSessionProcessing(id) {
  return prisma.mobileCaptureSession.update({
    where: { id },
    data: { status: "PROCESSING" },
  });
}

export async function markMobileCaptureSessionCompleted(id) {
  return prisma.mobileCaptureSession.update({
    where: { id },
    data: { status: "COMPLETED", usedAt: new Date() },
  });
}

export async function markMobileCaptureSessionFailed(id) {
  return prisma.mobileCaptureSession.update({
    where: { id },
    data: { status: "FAILED", usedAt: new Date() },
  });
}
