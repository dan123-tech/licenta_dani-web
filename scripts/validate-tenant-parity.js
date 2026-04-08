/* eslint-disable no-console */
require("dotenv").config();
const { createPrismaForScripts } = require("./prisma-for-scripts");
const { PrismaClient } = require("@prisma/client");

async function countControl(prisma, companyId) {
  const [members, cars, reservations, maintenanceEvents, invites, auditLogs] = await Promise.all([
    prisma.companyMember.count({ where: { companyId } }),
    prisma.car.count({ where: { companyId } }),
    prisma.reservation.count({ where: { car: { companyId } } }),
    prisma.maintenanceEvent.count({ where: { companyId } }),
    prisma.invite.count({ where: { companyId } }),
    prisma.auditLog.count({ where: { companyId } }),
  ]);
  return { members, cars, reservations, maintenanceEvents, invites, auditLogs };
}

async function countTenant(prisma, companyId) {
  const [members, cars, reservations, maintenanceEvents, invites, auditLogs] = await Promise.all([
    prisma.companyMember.count({ where: { companyId } }),
    prisma.car.count({ where: { companyId } }),
    prisma.reservation.count({ where: { car: { companyId } } }),
    prisma.maintenanceEvent.count({ where: { companyId } }),
    prisma.invite.count({ where: { companyId } }),
    prisma.auditLog.count({ where: { companyId } }),
  ]);
  return { members, cars, reservations, maintenanceEvents, invites, auditLogs };
}

async function main() {
  const companyId = process.argv[2] || "comp1";
  const tenantDatabaseUrl = process.env.COMP1_TENANT_DATABASE_URL?.trim();
  if (!tenantDatabaseUrl) throw new Error("COMP1_TENANT_DATABASE_URL is required");

  const control = createPrismaForScripts();
  const tenant = new PrismaClient({ datasources: { db: { url: tenantDatabaseUrl } } });
  try {
    const [source, target] = await Promise.all([countControl(control, companyId), countTenant(tenant, companyId)]);
    console.log("Control:", source);
    console.log("Tenant :", target);
  } finally {
    await control.$disconnect();
    await tenant.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
