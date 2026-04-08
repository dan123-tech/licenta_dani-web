-- CreateEnum
CREATE TYPE "CompanyTenantStatus" AS ENUM ('PROVISIONING', 'READY', 'FAILED');

-- CreateTable
CREATE TABLE "CompanyTenant" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'neon',
    "databaseUrl" TEXT NOT NULL,
    "branchId" TEXT,
    "branchName" TEXT,
    "databaseName" TEXT,
    "provisioningStatus" "CompanyTenantStatus" NOT NULL DEFAULT 'PROVISIONING',
    "provisioningError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompanyTenant_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CompanyTenant_companyId_key" ON "CompanyTenant"("companyId");

-- CreateIndex
CREATE INDEX "CompanyTenant_provisioningStatus_idx" ON "CompanyTenant"("provisioningStatus");

-- AddForeignKey
ALTER TABLE "CompanyTenant"
ADD CONSTRAINT "CompanyTenant_companyId_fkey"
FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
