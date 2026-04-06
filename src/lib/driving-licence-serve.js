/**
 * Build a Response streaming a driving licence image from DB stored value.
 */

import { readFile } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";
import { get } from "@vercel/blob";
import { DRIVING_LICENCE_PRIVATE_PREFIX } from "@/lib/driving-licence-ref";
import { resolveBlobReadWriteToken } from "@/lib/blob-env";

const LOCAL_PREFIX = "/uploads/driving-licences/";

const MIME_TYPES = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
};

/**
 * @param {string} stored - drivingLicenceUrl from DB
 * @param {Request} request
 * @returns {Promise<NextResponse>}
 */
export async function drivingLicenceImageResponse(stored, request) {
  const ifNoneMatch = request.headers.get("if-none-match") ?? undefined;
  const baseHeaders = {
    "X-Content-Type-Options": "nosniff",
    "Cache-Control": "private, no-store",
  };

  if (stored.startsWith(LOCAL_PREFIX)) {
    const filename = stored.slice(LOCAL_PREFIX.length);
    if (!filename || filename.includes("..") || filename.includes("/") || filename.includes("\\")) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const ext = path.extname(filename).toLowerCase();
    const mime = MIME_TYPES[ext];
    if (!mime) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const filepath = path.join(process.cwd(), "public", "uploads", "driving-licences", filename);
    try {
      const buffer = await readFile(filepath);
      return new NextResponse(buffer, {
        status: 200,
        headers: {
          ...baseHeaders,
          "Content-Type": mime,
        },
      });
    } catch {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
  }

  if (stored.startsWith(DRIVING_LICENCE_PRIVATE_PREFIX)) {
    const pathname = stored.slice(DRIVING_LICENCE_PRIVATE_PREFIX.length);
    if (!pathname || pathname.includes("..")) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const token = resolveBlobReadWriteToken();
    if (!token) {
      return NextResponse.json({ error: "Blob storage not configured" }, { status: 503 });
    }
    const result = await get(pathname, {
      access: "private",
      token,
      ifNoneMatch,
    });
    if (!result) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (result.statusCode === 304) {
      return new NextResponse(null, {
        status: 304,
        headers: {
          ...baseHeaders,
          ETag: result.blob.etag,
        },
      });
    }
    return new NextResponse(result.stream, {
      status: 200,
      headers: {
        ...baseHeaders,
        "Content-Type": result.blob.contentType,
        ETag: result.blob.etag,
      },
    });
  }

  if (stored.startsWith("https://") || stored.startsWith("http://")) {
    const isPrivate = stored.includes(".private.blob.vercel-storage.com");
    const access = isPrivate ? "private" : "public";
    const token = resolveBlobReadWriteToken();
    const result = await get(stored, {
      access,
      ...(token ? { token } : {}),
      ifNoneMatch,
    });
    if (!result) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (result.statusCode === 304) {
      return new NextResponse(null, {
        status: 304,
        headers: {
          ...baseHeaders,
          ETag: result.blob.etag,
        },
      });
    }
    return new NextResponse(result.stream, {
      status: 200,
      headers: {
        ...baseHeaders,
        "Content-Type": result.blob.contentType,
        ETag: result.blob.etag,
      },
    });
  }

  return NextResponse.json({ error: "Not found" }, { status: 404 });
}
