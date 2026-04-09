import { put, BlobAccessError } from "@vercel/blob";
import { randomUUID } from "crypto";
import { resolveBlobReadWriteToken, isEphemeralServerFilesystem } from "@/lib/blob-env";

/**
 * Store RCA document (PDF or image) as a public URL for in-app viewing.
 * @param {Buffer} buffer
 * @param {{ companyId: string, carId: string, filename: string, contentType: string }} meta
 * @returns {Promise<string>} HTTPS URL
 */
export async function persistGloveboxPublicDocument(buffer, { companyId, carId, filename, contentType }) {
  const safeName = String(filename || "rca.jpg").replace(/[^\w.\-() ]+/g, "_").slice(0, 120);
  const blobToken = resolveBlobReadWriteToken();
  const noDisk = isEphemeralServerFilesystem();

  if (noDisk && !blobToken) {
    throw new Error("MISSING_BLOB_TOKEN: Configure BLOB_READ_WRITE_TOKEN for glovebox uploads on this host.");
  }

  if (!blobToken) {
    throw new Error("Glovebox upload requires Vercel Blob (BLOB_READ_WRITE_TOKEN).");
  }

  const pathname = `glovebox/${companyId}/${carId}/${randomUUID()}-${safeName}`;
  try {
    const blob = await put(pathname, buffer, {
      access: "public",
      contentType: contentType || "application/octet-stream",
      token: blobToken,
    });
    return blob.url;
  } catch (e) {
    const accessDenied =
      e instanceof BlobAccessError ||
      e?.constructor?.name === "BlobAccessError" ||
      (typeof e?.message === "string" && e.message.includes("Access denied, please provide a valid token"));
    if (accessDenied) throw new Error("BLOB_ACCESS_MISMATCH: Glovebox upload was rejected (token/store mismatch).");
    throw new Error(`Vercel Blob upload failed (${e?.name || "Error"}): ${e?.message || String(e)}`);
  }
}
