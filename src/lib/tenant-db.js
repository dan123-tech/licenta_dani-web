import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import { prisma as controlPrisma } from "@/lib/db";

const tenantClients = new Map();
const MAX_TENANT_CLIENTS = 20;

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
  if (cfg.provisioningStatus !== "READY") {
    throw new Error(`Company tenant database not ready: ${cfg.provisioningStatus}`);
  }
  return cfg;
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
