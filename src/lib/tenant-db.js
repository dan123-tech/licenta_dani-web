import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import { prisma as controlPrisma } from "@/lib/db";

const tenantClients = new Map();
const MAX_TENANT_CLIENTS = 20;
const ALLOW_TENANT_FALLBACK = String(process.env.ALLOW_TENANT_FALLBACK || "").toLowerCase() === "true";

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
