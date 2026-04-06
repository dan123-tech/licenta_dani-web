/**
 * GET /api/users/[id]/driving-licence/image
 * Session-protected stream of the licence image (local file, public legacy Blob URL, or private Blob).
 */

import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getMembership, isCompanyAdmin } from "@/lib/companies";
import { errorResponse } from "@/lib/api-helpers";
import { drivingLicenceImageResponse } from "@/lib/driving-licence-serve";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request, { params }) {
  let session;
  try {
    session = await getSession();
  } catch (e) {
    console.error("[driving-licence image] getSession:", e);
    return errorResponse("Session check failed.", 503);
  }
  if (!session?.userId) {
    return errorResponse("Unauthorized", 401);
  }

  const { id: targetUserId } = await params;
  if (!targetUserId || typeof targetUserId !== "string") {
    return errorResponse("Invalid user", 400);
  }

  const user = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: { drivingLicenceUrl: true },
  });
  const stored = user?.drivingLicenceUrl;
  if (!stored) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const isSelf = session.userId === targetUserId;
  if (!isSelf) {
    if (!session.companyId) {
      return errorResponse("Forbidden", 403);
    }
    const [admin, member] = await Promise.all([
      isCompanyAdmin(session.userId, session.companyId),
      getMembership(targetUserId, session.companyId),
    ]);
    if (!admin || !member) {
      return errorResponse("Forbidden", 403);
    }
  }

  try {
    return await drivingLicenceImageResponse(stored, request);
  } catch (e) {
    console.error("[driving-licence image] serve failed:", e);
    return errorResponse("Failed to load image", 500);
  }
}
