/* eslint-disable no-console */
/**
 * Update every car in the database linked by DATABASE_URL (e.g. Neon) to a Romanian
 * driving-licence vehicle category. Default: B (standard passenger car).
 *
 * Usage:
 *   node scripts/set-all-cars-vehicle-category-b.js
 *   node scripts/set-all-cars-vehicle-category-b.js B
 *   node scripts/set-all-cars-vehicle-category-b.js B <companyId>   # only that company
 *
 * Requires DATABASE_URL in .env at repo root (same as the web app / Prisma).
 */
require("dotenv").config();

const { createPrismaForScripts } = require("./prisma-for-scripts");

const ALLOWED = new Set([
  "AM",
  "A1",
  "A2",
  "A",
  "B1",
  "B",
  "BE",
  "C1",
  "C",
  "C1E",
  "CE",
  "D1",
  "D",
  "D1E",
  "DE",
  "TR",
  "TB",
  "TV",
  "OTHER",
]);

async function main() {
  const category = String(process.argv[2] || "B").toUpperCase();
  const companyId = process.argv[3]?.trim() || null;

  if (!ALLOWED.has(category)) {
    console.error(`Invalid category "${category}". Use one of: ${[...ALLOWED].join(", ")}`);
    process.exit(1);
  }

  const prisma = createPrismaForScripts();
  try {
    const where = companyId ? { companyId } : {};
    const res = await prisma.car.updateMany({
      where,
      data: { vehicleCategory: category },
    });
    console.log(
      `[set-all-cars-vehicle-category] category=${category}${companyId ? ` companyId=${companyId}` : " (all companies)"} updated=${res.count}`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
