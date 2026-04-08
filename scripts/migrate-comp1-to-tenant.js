/* eslint-disable no-console */
require("dotenv").config();
const { createPrismaForScripts } = require("./prisma-for-scripts");
const { PrismaClient } = require("@prisma/client");

async function main() {
  const companyId = process.argv[2] || "comp1";
  const tenantDatabaseUrl = process.env.COMP1_TENANT_DATABASE_URL?.trim();
  if (!tenantDatabaseUrl) {
    throw new Error("Set COMP1_TENANT_DATABASE_URL in .env before running migration.");
  }

  const control = createPrismaForScripts();
  const tenant = new PrismaClient({
    datasources: { db: { url: tenantDatabaseUrl } },
  });

  try {
    const company = await control.company.findUnique({ where: { id: companyId } });
    if (!company) throw new Error(`Company not found: ${companyId}`);

    const members = await control.companyMember.findMany({ where: { companyId } });
    const users = await control.user.findMany({ where: { id: { in: members.map((m) => m.userId) } } });
    const cars = await control.car.findMany({ where: { companyId } });
    const reservations = await control.reservation.findMany({
      where: { car: { companyId } },
    });
    const maintenanceEvents = await control.maintenanceEvent.findMany({ where: { companyId } });
    const invites = await control.invite.findMany({ where: { companyId } });
    const auditLogs = await control.auditLog.findMany({ where: { companyId } });

    console.log("Preparing tenant migration:", {
      company: company.id,
      members: members.length,
      users: users.length,
      cars: cars.length,
      reservations: reservations.length,
      maintenanceEvents: maintenanceEvents.length,
      invites: invites.length,
      auditLogs: auditLogs.length,
    });

    await tenant.$transaction(async (tx) => {
      await tx.company.upsert({
        where: { id: company.id },
        update: company,
        create: company,
      });

      for (const user of users) {
        await tx.user.upsert({
          where: { id: user.id },
          update: user,
          create: user,
        });
      }
      for (const member of members) {
        await tx.companyMember.upsert({
          where: { userId_companyId: { userId: member.userId, companyId: member.companyId } },
          update: member,
          create: member,
        });
      }
      for (const car of cars) {
        await tx.car.upsert({
          where: { id: car.id },
          update: car,
          create: car,
        });
      }
      for (const reservation of reservations) {
        await tx.reservation.upsert({
          where: { id: reservation.id },
          update: reservation,
          create: reservation,
        });
      }
      for (const event of maintenanceEvents) {
        await tx.maintenanceEvent.upsert({
          where: { id: event.id },
          update: event,
          create: event,
        });
      }
      for (const invite of invites) {
        await tx.invite.upsert({
          where: { id: invite.id },
          update: invite,
          create: invite,
        });
      }
      for (const log of auditLogs) {
        await tx.auditLog.upsert({
          where: { id: log.id },
          update: log,
          create: log,
        });
      }
    });

    await control.companyTenant.upsert({
      where: { companyId },
      update: {
        provider: "neon",
        databaseUrl: tenantDatabaseUrl,
        provisioningStatus: "READY",
        provisioningError: null,
      },
      create: {
        companyId,
        provider: "neon",
        databaseUrl: tenantDatabaseUrl,
        provisioningStatus: "READY",
      },
    });

    console.log("comp1 migration completed");
  } finally {
    await control.$disconnect();
    await tenant.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
