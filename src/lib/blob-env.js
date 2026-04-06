/**
 * Resolve Vercel Blob token from process.env or Cloudflare Worker `env` (OpenNext).
 * Vercel dashboard variables are not visible to Cloudflare Workers — set the same token
 * in Workers & Pages → Variables / `wrangler secret put BLOB_READ_WRITE_TOKEN`.
 */

import { getCloudflareContext } from "@opennextjs/cloudflare";

/**
 * @returns {Record<string, unknown> | null}
 */
export function tryCloudflareWorkerEnv() {
  try {
    return getCloudflareContext()?.env ?? null;
  } catch {
    return null;
  }
}

/**
 * @returns {string}
 */
export function resolveBlobReadWriteToken() {
  const fromProcess = process.env.BLOB_READ_WRITE_TOKEN?.trim();
  if (fromProcess) return fromProcess;
  const cf = tryCloudflareWorkerEnv();
  const raw = cf?.BLOB_READ_WRITE_TOKEN;
  if (typeof raw === "string" && raw.trim()) {
    const v = raw.trim();
    process.env.BLOB_READ_WRITE_TOKEN = v;
    return v;
  }
  return "";
}

/** No persistent writable disk for arbitrary uploads (Vercel serverless or CF Worker). */
export function isEphemeralServerFilesystem() {
  if (process.env.VERCEL === "1") return true;
  return tryCloudflareWorkerEnv() != null;
}
