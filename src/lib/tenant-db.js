import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import { prisma as controlPrisma } from "@/lib/db";

const tenantClients = new Map();
const MAX_TENANT_CLIENTS = 20;
const ALLOW_TENANT_FALLBACK = String(process.env.ALLOW_TENANT_FALLBACK || "").toLowerCase() === "true";
const tenantSchemaReady = new Set();

function isNeonUrl(url) {
  return /neon\.tech/i.test(url || "");
}

function createTenantClient(databaseUrl) {
  if (!databaseUrl) throw new Error("Tenant DATABASE_URL is missing");
  const log = process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"];
  if (isNeonUrl(databaseUrl)) {
    const adapter = new PrismaNeon({ connectionString: databaseUrl });
    return new PrismaClient({ adapter, log });
  }
  return new PrismaClient({ datasources: { db: { url: databaseUrl } }, log });
}

function isUsableDatabaseUrl(url) {
  const v = String(url || "").trim();
  if (!v) return false;
  if (v.startsWith("pending://")) return false;
  return v.startsWith("postgres://") || v.startsWith("postgresql://");
}

function touchClient(companyId, client) {
  if (tenantClients.has(companyId)) tenantClients.delete(companyId);
  tenantClients.set(companyId, client);
  if (tenantClients.size > MAX_TENANT_CLIENTS) {
    const oldest = tenantClients.keys().next().value;
    const oldestClient = tenantClients.get(oldest);
    tenantClients.delete(oldest);
    oldestClient?.$disconnect?.().catch(() => {});
  }
}

async function bootstrapTenantSchema(client) {
  await client.$executeRawUnsafe(`
DO $$ BEGIN CREATE TYPE "Role" AS ENUM ('ADMIN', 'USER'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "MemberStatus" AS ENUM ('ENROLLED', 'PENDING_INVITE'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "CarStatus" AS ENUM ('AVAILABLE', 'RESERVED', 'IN_MAINTENANCE'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "ReservationStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'CANCELLED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "ExceededApprovalStatus" AS ENUM ('PENDING_APPROVAL', 'APPROVED', 'REJECTED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "FuelType" AS ENUM ('Benzine', 'Diesel', 'Electric', 'Hybrid'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "AuditAction" AS ENUM (
  'CAR_ADDED','CAR_UPDATED','CAR_STATUS_CHANGED','CAR_DELETED',
  'RESERVATION_CREATED','RESERVATION_CANCELLED','RESERVATION_COMPLETED','RESERVATION_EXTENDED',
  'KM_EXCEEDED_APPROVED','KM_EXCEEDED_REJECTED','PRICING_CHANGED','COMPANY_SETTINGS_CHANGED',
  'USER_INVITED','USER_ROLE_CHANGED','USER_REMOVED','DRIVING_LICENCE_STATUS_CHANGED'
); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
`);

  await client.$executeRawUnsafe(`
CREATE TABLE IF NOT EXISTS "User" (
  "id" TEXT PRIMARY KEY,
  "email" TEXT NOT NULL UNIQUE,
  "password" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "avatarUrl" TEXT,
  "drivingLicenceUrl" TEXT,
  "drivingLicenceStatus" TEXT,
  "drivingLicenceVerifiedBy" TEXT,
  "selfieUrl" TEXT,
  "identityStatus" TEXT,
  "identityVerifiedAt" TIMESTAMP(3),
  "identityVerifiedBy" TEXT,
  "identityScore" DOUBLE PRECISION,
  "identityReason" TEXT,
  "fcmToken" TEXT,
  "fcmTokenUpdatedAt" TIMESTAMP(3),
  "mfaEnabled" BOOLEAN NOT NULL DEFAULT false,
  "mustChangePassword" BOOLEAN NOT NULL DEFAULT false,
  "mfaOtpHash" TEXT,
  "mfaOtpExpiresAt" TIMESTAMP(3),
  "mfaOtpAttempts" INTEGER NOT NULL DEFAULT 0,
  "emailBookingNotifications" BOOLEAN NOT NULL DEFAULT true,
  "calendarFeedToken" TEXT UNIQUE,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "Company" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT NOT NULL,
  "domain" TEXT,
  "joinCode" TEXT UNIQUE,
  "defaultKmUsage" INTEGER NOT NULL DEFAULT 100,
  "averageFuelPricePerLiter" DOUBLE PRECISION,
  "defaultConsumptionL100km" DOUBLE PRECISION DEFAULT 7.5,
  "priceBenzinePerLiter" DOUBLE PRECISION,
  "priceDieselPerLiter" DOUBLE PRECISION,
  "priceHybridPerLiter" DOUBLE PRECISION,
  "priceElectricityPerKwh" DOUBLE PRECISION,
  "dataSourceConfig" JSONB,
  "dataSourceCredentials" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "CompanyMember" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "role" "Role" NOT NULL DEFAULT 'USER',
  "status" "MemberStatus" NOT NULL DEFAULT 'PENDING_INVITE',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CompanyMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "CompanyMember_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "CompanyMember_userId_companyId_key" UNIQUE ("userId","companyId")
);

CREATE TABLE IF NOT EXISTS "Invite" (
  "id" TEXT PRIMARY KEY,
  "token" TEXT NOT NULL UNIQUE,
  "email" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "usedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Invite_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "Car" (
  "id" TEXT PRIMARY KEY,
  "companyId" TEXT NOT NULL,
  "brand" TEXT NOT NULL,
  "model" TEXT,
  "registrationNumber" TEXT NOT NULL,
  "km" INTEGER NOT NULL DEFAULT 0,
  "status" "CarStatus" NOT NULL DEFAULT 'AVAILABLE',
  "fuelType" "FuelType" NOT NULL DEFAULT 'Benzine',
  "averageConsumptionL100km" DOUBLE PRECISION,
  "averageConsumptionKwh100km" DOUBLE PRECISION,
  "batteryLevel" INTEGER,
  "batteryCapacityKwh" DOUBLE PRECISION,
  "lastServiceMileage" INTEGER,
  "lastServiceYearMonth" VARCHAR(7),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Car_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "MaintenanceEvent" (
  "id" TEXT PRIMARY KEY,
  "companyId" TEXT NOT NULL,
  "carId" TEXT NOT NULL,
  "performedAt" TIMESTAMP(3) NOT NULL,
  "mileageKm" INTEGER,
  "serviceType" VARCHAR(120) NOT NULL,
  "cost" DOUBLE PRECISION,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MaintenanceEvent_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "MaintenanceEvent_carId_fkey" FOREIGN KEY ("carId") REFERENCES "Car"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "Reservation" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "carId" TEXT NOT NULL,
  "startDate" TIMESTAMP(3) NOT NULL,
  "endDate" TIMESTAMP(3) NOT NULL,
  "purpose" TEXT,
  "status" "ReservationStatus" NOT NULL DEFAULT 'ACTIVE',
  "pickup_code" TEXT,
  "code_valid_from" TIMESTAMP(3),
  "release_code" TEXT,
  "releasedKmUsed" INTEGER,
  "releasedExceededReason" TEXT,
  "releasedExceededStatus" "ExceededApprovalStatus",
  "releasedExceededAdminComment" TEXT,
  "pushReminderBeforeStartSentAt" TIMESTAMP(3),
  "pushReminderStartSentAt" TIMESTAMP(3),
  "pushReminderEndSentAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Reservation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "Reservation_carId_fkey" FOREIGN KEY ("carId") REFERENCES "Car"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "AuditLog" (
  "id" TEXT PRIMARY KEY,
  "companyId" TEXT NOT NULL,
  "actorId" TEXT,
  "action" "AuditAction" NOT NULL,
  "entityType" TEXT NOT NULL,
  "entityId" TEXT,
  "meta" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
`);
}

export async function ensureTenantSchema(companyId) {
  if (!companyId) throw new Error("companyId is required");
  if (tenantSchemaReady.has(companyId)) return;
  const client = await getTenantPrisma(companyId);
  const rows = await client.$queryRawUnsafe(`
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'User'
    LIMIT 1
  `);
  if (!Array.isArray(rows) || rows.length === 0) {
    await bootstrapTenantSchema(client);
  }
  tenantSchemaReady.add(companyId);
}

export async function getTenantConfig(companyId) {
  if (!companyId) throw new Error("companyId is required");
  const cfg = await controlPrisma.companyTenant.findUnique({ where: { companyId } });
  if (!cfg) throw new Error("Company tenant database is not configured yet");
  if (cfg.provisioningStatus === "READY" && isUsableDatabaseUrl(cfg.databaseUrl)) {
    return cfg;
  }

  // Graceful runtime fallback: if tenant provisioning is blocked/failed, keep the company usable
  // on control-plane DB instead of hard failing requests with 503.
  const controlDbUrl = String(process.env.DATABASE_URL || "").trim();
  if (ALLOW_TENANT_FALLBACK && isUsableDatabaseUrl(controlDbUrl)) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[tenant-db] fallback to control DATABASE_URL", {
        companyId,
        provisioningStatus: cfg.provisioningStatus,
      });
    }
    return {
      ...cfg,
      databaseUrl: isUsableDatabaseUrl(cfg.databaseUrl) ? cfg.databaseUrl : controlDbUrl,
    };
  }

  throw new Error(`Company tenant database not ready: ${cfg.provisioningStatus}`);
}

export async function getTenantPrisma(companyId) {
  if (tenantClients.has(companyId)) {
    const client = tenantClients.get(companyId);
    touchClient(companyId, client);
    return client;
  }
  const cfg = await getTenantConfig(companyId);
  const client = createTenantClient(cfg.databaseUrl);
  touchClient(companyId, client);
  return client;
}

export async function withTenant(companyId, fn) {
  const tenant = await getTenantPrisma(companyId);
  return fn(tenant);
}
