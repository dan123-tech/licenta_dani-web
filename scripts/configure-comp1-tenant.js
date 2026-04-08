/* eslint-disable no-console */
require("dotenv").config();
const { createPrismaForScripts } = require("./prisma-for-scripts");

async function main() {
  const prisma = createPrismaForScripts();
  try {
    const databaseUrl = process.env.DATABASE_URL?.trim();
    if (!databaseUrl) throw new Error("DATABASE_URL is required");

    const companyRow = await prisma.$queryRawUnsafe(
      'SELECT "id", "name" FROM "Company" WHERE "id" = $1 OR lower("name") = $2 ORDER BY "createdAt" DESC LIMIT 1',
      "comp1",
      "comp1"
    );
    if (!Array.isArray(companyRow) || companyRow.length === 0) {
      const known = await prisma.$queryRawUnsafe(
        'SELECT "id", "name" FROM "Company" ORDER BY "createdAt" DESC LIMIT 10'
      );
      throw new Error(`Company 'comp1' not found in this database. Latest companies: ${JSON.stringify(known)}`);
    }
    const companyId = companyRow[0].id;
    const existing = await prisma.$queryRawUnsafe(
      'SELECT "companyId" FROM "CompanyTenant" WHERE "companyId" = $1 LIMIT 1',
      companyId
    );

    if (Array.isArray(existing) && existing.length > 0) {
      await prisma.$executeRawUnsafe(
        'UPDATE "CompanyTenant" SET "databaseUrl" = $1, "provider" = $2, "provisioningStatus" = $3, "provisioningError" = NULL, "updatedAt" = NOW() WHERE "companyId" = $4',
        databaseUrl,
        "neon",
        "READY",
        companyId
      );
    } else {
      await prisma.$executeRawUnsafe(
        'INSERT INTO "CompanyTenant" ("id", "companyId", "provider", "databaseUrl", "provisioningStatus", "createdAt", "updatedAt") VALUES ($1, $2, $3, $4, $5, NOW(), NOW())',
        "manual_comp1_tenant",
        companyId,
        "neon",
        databaseUrl,
        "READY"
      );
    }

    const rows = await prisma.$queryRawUnsafe(
      'SELECT "companyId", "provider", "provisioningStatus", "provisioningError", "updatedAt" FROM "CompanyTenant" WHERE "companyId" = $1',
      companyId
    );
    console.log(JSON.stringify(rows, null, 2));
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
