-- Journey sheet odometer readings (filled on vehicle release)
ALTER TABLE "Reservation" ADD COLUMN IF NOT EXISTS "releasedOdometerStart" INTEGER;
ALTER TABLE "Reservation" ADD COLUMN IF NOT EXISTS "releasedOdometerEnd" INTEGER;

-- Digital glovebox: RCA QR image URL + expiries (admin-managed)
ALTER TABLE "Car" ADD COLUMN IF NOT EXISTS "rcaExpiresAt" TIMESTAMP(3);
ALTER TABLE "Car" ADD COLUMN IF NOT EXISTS "rcaDocumentUrl" TEXT;
ALTER TABLE "Car" ADD COLUMN IF NOT EXISTS "rcaLastNotifiedAt" TIMESTAMP(3);
ALTER TABLE "Car" ADD COLUMN IF NOT EXISTS "vignetteExpiresAt" TIMESTAMP(3);
