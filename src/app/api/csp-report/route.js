/**
 * CSP reporting endpoint (used when CSP_REPORT_ONLY=1 or when report-uri is enabled).
 *
 * Browsers POST JSON with various shapes (report-to, legacy report-uri).
 * We keep it lightweight: accept and log (truncated), return 204.
 */

import { jsonResponse } from "@/lib/api-helpers";

export const runtime = "nodejs";

export async function POST(request) {
  let body = null;
  try {
    body = await request.json();
  } catch {
    // Some browsers send invalid/empty bodies; still return 204.
    return new Response(null, { status: 204 });
  }

  try {
    const s = JSON.stringify(body);
    console.warn("[csp-report]", s.length > 4000 ? s.slice(0, 4000) + "…" : s);
  } catch {
    console.warn("[csp-report] (unstringifiable report)");
  }

  // Also return ok for debugging tools that expect JSON.
  if (request.headers.get("accept")?.includes("application/json")) {
    return jsonResponse({ ok: true });
  }
  return new Response(null, { status: 204 });
}

