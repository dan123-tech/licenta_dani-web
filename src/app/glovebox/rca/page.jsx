"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { apiGloveboxActive } from "@/lib/api";

function isPdf(url, contentType) {
  const ct = String(contentType || "").toLowerCase();
  if (ct.includes("pdf")) return true;
  const base = String(url || "").split("?")[0].toLowerCase();
  return base.endsWith(".pdf");
}

function isImage(url, contentType) {
  const ct = String(contentType || "").toLowerCase();
  if (ct.startsWith("image/")) return true;
  const base = String(url || "").split("?")[0];
  return /\.(jpe?g|png|gif|webp|heic|bmp)$/i.test(base);
}

export default function GloveboxRcaViewerPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [payload, setPayload] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const d = await apiGloveboxActive();
        if (!cancelled) setPayload(d);
      } catch (e) {
        if (!cancelled) setError(e?.message || "Failed to load");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const url = payload?.active ? payload.car?.rcaDocumentUrl : null;
  const ct = payload?.car?.rcaDocumentContentType;

  const mode = useMemo(() => {
    if (!url) return "none";
    if (isPdf(url, ct)) return "pdf";
    if (isImage(url, ct)) return "image";
    return "embed";
  }, [url, ct]);

  return (
    <div className="min-h-[100dvh] flex flex-col bg-slate-100">
      <header className="shrink-0 flex flex-wrap items-center gap-3 px-4 py-3 border-b border-slate-200 bg-white shadow-sm">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#185FA5] hover:underline"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden />
          Back to dashboard
        </Link>
        <span className="text-sm font-semibold text-slate-800 truncate">RCA document</span>
        {url ? (
          <a
            href={url}
            target="_blank"
            rel="noreferrer noopener"
            className="ml-auto text-sm font-medium text-slate-600 hover:text-[#185FA5] underline"
          >
            Open in new tab
          </a>
        ) : null}
      </header>

      <main className="flex-1 min-h-0 flex flex-col">
        {loading && <p className="p-4 text-slate-600">Loading…</p>}
        {!loading && error && <p className="p-4 text-red-700">{error}</p>}
        {!loading && !error && !payload?.active && (
          <p className="p-4 text-slate-600">You need an active reservation to view the RCA file for your vehicle.</p>
        )}
        {!loading && !error && payload?.active && !url && (
          <p className="p-4 text-slate-600">No RCA file has been uploaded for this vehicle yet.</p>
        )}
        {!loading && !error && url && mode === "pdf" && (
          <iframe title="RCA PDF" src={url} className="flex-1 w-full min-h-[75vh] border-0 bg-slate-200" />
        )}
        {!loading && !error && url && mode === "image" && (
          <div className="flex-1 overflow-auto flex items-start justify-center p-4 bg-slate-900">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt="RCA document" className="max-w-full w-auto h-auto object-contain" />
          </div>
        )}
        {!loading && !error && url && mode === "embed" && (
          <iframe title="RCA document" src={url} className="flex-1 w-full min-h-[75vh] border-0 bg-white" />
        )}
      </main>
    </div>
  );
}
