/**
 * Driving licence storage values in DB vs URLs exposed to clients.
 * Private Vercel Blob is not browser-accessible; we store an internal ref and
 * expose only /api/users/:id/driving-licence/image (session-protected).
 */

/** Prefix for pathname stored after private Blob put(). */
export const DRIVING_LICENCE_PRIVATE_PREFIX = "private:";

/**
 * Whether this stored value should be loaded via our authenticated image route.
 * @param {string | null | undefined} stored
 */
export function drivingLicenceStoredNeedsProxy(stored) {
  if (stored == null || typeof stored !== "string" || !stored.trim()) return false;
  if (stored.startsWith(DRIVING_LICENCE_PRIVATE_PREFIX)) return true;
  if (stored.startsWith("/uploads/driving-licences/")) return true;
  if (stored.includes("blob.vercel-storage.com")) return true;
  return false;
}

/**
 * Client-safe URL for <img src> / mobile (resolve against API origin if relative).
 * @param {string | null | undefined} stored - DB value
 * @param {string} targetUserId - Prisma user id (member.userId)
 * @returns {string | null}
 */
export function drivingLicenceUrlForApi(stored, targetUserId) {
  if (stored == null || typeof stored !== "string" || !stored.trim()) return null;
  if (drivingLicenceStoredNeedsProxy(stored)) {
    return `/api/users/${encodeURIComponent(targetUserId)}/driving-licence/image`;
  }
  return stored;
}
