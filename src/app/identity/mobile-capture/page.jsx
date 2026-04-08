"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  apiMobileCaptureSessionInfo,
  apiSubmitMobileCapture,
} from "@/lib/api";

export default function MobileCapturePage() {
  const searchParams = useSearchParams();
  const token = useMemo(() => String(searchParams.get("token") || "").trim(), [searchParams]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sessionInfo, setSessionInfo] = useState(null);
  const [cameraOpening, setCameraOpening] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [captureUrl, setCaptureUrl] = useState(null);
  const [captureFile, setCaptureFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  useEffect(() => {
    async function loadSession() {
      if (!token) {
        setError("Missing verification token.");
        setLoading(false);
        return;
      }
      try {
        const info = await apiMobileCaptureSessionInfo(token);
        setSessionInfo(info);
      } catch (e) {
        setError(e?.message || "Invalid or expired verification link.");
      } finally {
        setLoading(false);
      }
    }
    loadSession();
  }, [token]);

  useEffect(() => {
    return () => {
      if (captureUrl) URL.revokeObjectURL(captureUrl);
      if (streamRef.current) {
        for (const track of streamRef.current.getTracks()) track.stop();
      }
    };
  }, [captureUrl]);

  async function startCamera() {
    setError("");
    setCameraOpening(true);
    try {
      if (!navigator?.mediaDevices?.getUserMedia) {
        throw new Error("Camera is not supported in this browser.");
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 720 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      setCameraReady(true);
    } catch (e) {
      setError(e?.message || "Could not open camera.");
    } finally {
      setCameraOpening(false);
    }
  }

  function stopCamera() {
    if (streamRef.current) {
      for (const track of streamRef.current.getTracks()) track.stop();
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraReady(false);
  }

  async function captureFrame() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState < 2 || !video.videoWidth || !video.videoHeight) {
      setError("Camera is starting. Try capture again in 1-2 seconds.");
      return;
    }
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.92));
    if (!blob) {
      setError("Failed to capture image.");
      return;
    }
    const file = new File([blob], `mobile-selfie-${Date.now()}.jpg`, { type: "image/jpeg" });
    if (captureUrl) URL.revokeObjectURL(captureUrl);
    setCaptureUrl(URL.createObjectURL(file));
    setCaptureFile(file);
    stopCamera();
  }

  async function submitCapture() {
    if (!captureFile || !token) return;
    setSubmitting(true);
    setError("");
    try {
      const out = await apiSubmitMobileCapture(token, captureFile);
      setResult(out);
    } catch (e) {
      setError(e?.message || "Failed to submit face capture.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <main className="min-h-screen flex items-center justify-center"><p className="text-slate-600">Loading verification session…</p></main>;
  }

  if (error && !sessionInfo) {
    return <main className="min-h-screen flex items-center justify-center p-6"><p className="text-red-700 text-center">{error}</p></main>;
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 p-4">
      <div className="max-w-md mx-auto bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
        <h1 className="text-lg font-bold">Mobile Identity Verification</h1>
        <p className="text-sm text-slate-600 mt-1">
          {sessionInfo?.userName ? `Hi ${sessionInfo.userName}, ` : ""}
          take a clear selfie so we can compare it with your driving licence photo.
        </p>
        {sessionInfo?.expiresAt && (
          <p className="text-xs text-slate-500 mt-1">Link expires: {new Date(sessionInfo.expiresAt).toLocaleString()}</p>
        )}

        {cameraReady && (
          <div className="mt-4 rounded-xl border border-slate-200 overflow-hidden bg-black">
            <video ref={videoRef} autoPlay playsInline muted className="w-full h-auto max-h-80 object-contain" />
          </div>
        )}
        <canvas ref={canvasRef} className="hidden" />

        {captureUrl && (
          <div className="mt-4">
            <p className="text-sm font-medium mb-2">Captured photo</p>
            <img src={captureUrl} alt="Captured selfie" className="rounded-xl border border-slate-200 bg-slate-50 w-full h-auto max-h-80 object-contain" />
          </div>
        )}

        <div className="mt-4 flex flex-wrap gap-2">
          {!cameraReady && (
            <button
              type="button"
              onClick={startCamera}
              disabled={cameraOpening || submitting}
              className="px-4 py-2 rounded-xl bg-[var(--primary)] text-white font-semibold disabled:opacity-40"
            >
              {cameraOpening ? "Opening camera…" : "Start camera"}
            </button>
          )}
          {cameraReady && (
            <>
              <button
                type="button"
                onClick={captureFrame}
                className="px-4 py-2 rounded-xl bg-red-500 text-white font-semibold"
              >
                Capture photo
              </button>
              <button
                type="button"
                onClick={stopCamera}
                className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-semibold"
              >
                Stop camera
              </button>
            </>
          )}
          <button
            type="button"
            onClick={submitCapture}
            disabled={!captureFile || submitting}
            className="px-4 py-2 rounded-xl bg-slate-900 text-white font-semibold disabled:opacity-40"
          >
            {submitting ? "Submitting…" : "Submit verification"}
          </button>
        </div>

        {error && <p className="mt-3 text-sm text-red-700">{error}</p>}

        {result?.identityStatus && (
          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-sm font-semibold">Result: {result.identityStatus}</p>
            {typeof result.identityScore === "number" && (
              <p className="text-xs text-slate-600 mt-1">Score: {result.identityScore.toFixed(3)}</p>
            )}
            {result.message && <p className="text-xs text-slate-600 mt-1">{result.message}</p>}
          </div>
        )}
      </div>
    </main>
  );
}
