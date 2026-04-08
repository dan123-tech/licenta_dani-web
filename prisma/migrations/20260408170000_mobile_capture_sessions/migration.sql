-- CreateTable
CREATE TABLE "MobileCaptureSession" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "emailSentAt" TIMESTAMP(3),
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MobileCaptureSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MobileCaptureSession_token_key" ON "MobileCaptureSession"("token");

-- CreateIndex
CREATE INDEX "MobileCaptureSession_userId_createdAt_idx" ON "MobileCaptureSession"("userId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "MobileCaptureSession_companyId_createdAt_idx" ON "MobileCaptureSession"("companyId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "MobileCaptureSession_expiresAt_idx" ON "MobileCaptureSession"("expiresAt");

-- CreateIndex
CREATE INDEX "MobileCaptureSession_status_idx" ON "MobileCaptureSession"("status");

-- AddForeignKey
ALTER TABLE "MobileCaptureSession" ADD CONSTRAINT "MobileCaptureSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MobileCaptureSession" ADD CONSTRAINT "MobileCaptureSession_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
