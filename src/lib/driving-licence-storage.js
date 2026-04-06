/**
 * Driving licence image storage: Vercel Blob in production (when token set),
 * otherwise local public/uploads (Docker / local dev).
 *
 * On Vercel, Blob store should be **private** (sensitive PII). We store `private:pathname`
 * in the DB and serve via GET /api/users/[id]/driving-licence/image.
 */

import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { put, BlobAccessError } from "@vercel/blob";
import { DRIVING_LICENCE_PRIVATE_PREFIX } from "@/lib/driving-licence-ref";
import { resolveBlobReadWriteToken, isEphemeralServerFilesystem } from "@/lib/blob-env";

/**
 * Must match the Vercel Blob **store** type (set at store creation; cannot be changed later).
 * - `private` (default): private store + we save `private:pathname` in the DB.
 * - `public`: public store + we save `blob.url` (still proxied in API responses when possible).
 */
function blobPutAccess() {
  const v = (process.env.BLOB_PUT_ACCESS || process.env.BLOB_ACCESS || "private").trim().toLowerCase();
  return v === "public" ? "public" : "private";
}

/**
 * @param {Buffer} buffer
 * @param {{ userId: string, ext: string, contentType: string }} meta
 * @returns {Promise<string>} DB value: `private:pathname` on Blob, or `/uploads/driving-licences/...` locally
 */
export async function persistDrivingLicenceImage(buffer, { userId, ext, contentType }) {
  const basename = `${userId}-${Date.now()}${ext}`;

  const blobToken = resolveBlobReadWriteToken();
  const noDisk = isEphemeralServerFilesystem();

  if (noDisk && !blobToken) {
    throw new Error(
      "MISSING_BLOB_TOKEN: This host has no writable upload folder. If you use Vercel: Project → Storage → Blob → link store so BLOB_READ_WRITE_TOKEN exists, then redeploy. If you use Cloudflare Workers (OpenNext): add the same token under Workers → Settings → Variables, or run `wrangler secret put BLOB_READ_WRITE_TOKEN` — Vercel env alone is not applied on Workers."
    );
  }

  if (blobToken) {
    const pathname = `driving-licences/${basename}`;
    const access = blobPutAccess();
    try {
      const blob = await put(pathname, buffer, {
        access,
        contentType: contentType || "image/jpeg",
        token: blobToken,
      });
      if (access === "private") {
        return `${DRIVING_LICENCE_PRIVATE_PREFIX}${blob.pathname}`;
      }
      return blob.url;
    } catch (e) {
      const accessDenied =
        e instanceof BlobAccessError ||
        e?.constructor?.name === "BlobAccessError" ||
        (typeof e?.message === "string" && e.message.includes("Access denied, please provide a valid token"));
      if (accessDenied) {
        throw new Error(
          access === "private"
            ? "BLOB_ACCESS_MISMATCH: Upload was rejected (wrong store type vs BLOB_PUT_ACCESS, or token does not match this Blob store). Use a private store + token from the same Vercel project, or set BLOB_PUT_ACCESS=public for a public-only store. On Cloudflare Workers, the token must be set on the Worker, not only on Vercel."
            : "BLOB_ACCESS_MISMATCH: Upload was rejected (often a private Blob store with BLOB_PUT_ACCESS=public). Set BLOB_PUT_ACCESS=private or link a public store."
        );
      }
      const hint = e?.message || String(e);
      throw new Error(
        `Vercel Blob upload failed (${e?.name || "Error"}): ${hint}. Check BLOB_READ_WRITE_TOKEN and that a Blob store is linked to this project.`
      );
    }
  }

  const dir = path.join(process.cwd(), "public", "uploads", "driving-licences");
  await mkdir(dir, { recursive: true });
  const filepath = path.join(dir, basename);
  await writeFile(filepath, buffer);
  return `/uploads/driving-licences/${basename}`;
}
