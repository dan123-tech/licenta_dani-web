-- Rovinietă / vignette PDF in digital glovebox (mirror RCA storage fields)
ALTER TABLE "Car" ADD COLUMN IF NOT EXISTS "vignetteDocumentUrl" TEXT;
ALTER TABLE "Car" ADD COLUMN IF NOT EXISTS "vignetteDocumentContentType" VARCHAR(120);
ALTER TABLE "Car" ADD COLUMN IF NOT EXISTS "vignetteLastNotifiedAt" TIMESTAMP(3);
