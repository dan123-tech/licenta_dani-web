/**
 * GET /api/companies/current/data-source-config – always LOCAL (PostgreSQL/Prisma) in web edition.
 */

import { getDataSourceConfig } from "@/lib/data-source-manager";
import { requireCompany, jsonResponse, errorResponse } from "@/lib/api-helpers";

function errMsg(e) {
  return e?.message ?? (typeof e === "string" ? e : "Request failed");
}

export async function GET() {
  try {
    const out = await requireCompany();
    if ("response" in out) return out.response;
    const config = await getDataSourceConfig(out.session.companyId);
    return jsonResponse(config);
  } catch (err) {
    console.error("GET data-source-config error:", err);
    return errorResponse(errMsg(err), 500);
  }
}
