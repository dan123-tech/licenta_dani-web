/**
 * POST /api/cars/[id]/rca-document — admin uploads RCA as PDF or image (public URL + content type on Car).
 */
import { requireAdmin, errorResponse, jsonResponse } from "@/lib/api-helpers";
import { getCarById, updateCar } from "@/lib/cars";
import { persistGloveboxPublicDocument } from "@/lib/glovebox-storage";
import { getProvider, LAYERS, PROVIDERS } from "@/lib/data-source-manager";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request, { params }) {
  const out = await requireAdmin();
  if ("response" in out) return out.response;

  try {
    const provider = await getProvider(out.session.companyId, LAYERS.CARS);
    if (provider !== PROVIDERS.LOCAL) return errorResponse("Local cars data source required", 503);
  } catch (err) {
    return errorResponse(err?.message || "Failed to verify data source", 500);
  }

  const { id: carId } = await params;
  const car = await getCarById(carId, out.session.companyId);
  if (!car) return errorResponse("Car not found", 404);

  let form;
  try {
    form = await request.formData();
  } catch {
    return errorResponse("Expected multipart/form-data", 422);
  }

  const file = form.get("file");
  if (!file || typeof file === "string") return errorResponse("Missing file", 422);

  const buf = Buffer.from(await file.arrayBuffer());
  if (!buf.length) return errorResponse("Empty file", 422);

  const rawType = String(file.type || "").toLowerCase();
  if (!rawType.startsWith("image/") && rawType !== "application/pdf") {
    return errorResponse("RCA file must be a PDF or an image (e.g. scan or photo).", 422);
  }

  const defaultName = rawType === "application/pdf" ? "rca.pdf" : "rca.jpg";
  const url = await persistGloveboxPublicDocument(buf, {
    companyId: out.session.companyId,
    carId,
    filename: file.name || defaultName,
    contentType: rawType || "application/octet-stream",
  });

  await updateCar(carId, out.session.companyId, {
    rcaDocumentUrl: url,
    rcaDocumentContentType: rawType || null,
    rcaLastNotifiedAt: null,
  });

  return jsonResponse({ ok: true, rcaDocumentUrl: url });
}
