/**
 * Ensure each car has at least two sample maintenance log entries (only if it has none yet).
 * Updates lastServiceMileage / lastServiceYearMonth from the most recent seeded event.
 *
 * Run: node scripts/seed-maintenance-all-cars.js
 * Optional: COMPANY_ID=... in .env or env to limit to one company (otherwise all cars in DB).
 *
 * Used by: npm run seed (via seed-users-and-cars.js) for the demo company.
 */

const path = require("path");
const fs = require("fs");

const envPath = path.resolve(process.cwd(), ".env");
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, "utf8");
  content.split("\n").forEach((line) => {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) process.env[match[1].trim()] = match[2].trim().replace(/^["']|["']$/g, "");
  });
}

const { createPrismaForScripts } = require("./prisma-for-scripts.js");

function monthsAgo(n) {
  const d = new Date();
  d.setMonth(d.getMonth() - n);
  d.setHours(10, 0, 0, 0);
  return d;
}

/** @param {Date} d */
function toYearMonth(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

const PAIRS = [
  { olderMonths: 10, newerMonths: 3, types: ["Oil & filter change", "Annual safety inspection"], costs: [185, 95] },
  { olderMonths: 9, newerMonths: 2, types: ["Brake fluid & pads check", "Tire rotation & alignment"], costs: [220, 75] },
  { olderMonths: 11, newerMonths: 4, types: ["General service", "Battery & lights check"], costs: [150, 60] },
  { olderMonths: 8, newerMonths: 2, types: ["Timing belt inspection", "AC service"], costs: [310, 120] },
  { olderMonths: 12, newerMonths: 5, types: ["Oil change", "Winter check"], costs: [140, 55] },
];

/**
 * @param {import("@prisma/client").PrismaClient} prisma
 * @param {{ companyId?: string }} [opts]
 * @returns {Promise<{ created: number, carsTouched: number }>}
 */
async function ensureMaintenanceForCars(prisma, opts = {}) {
  const where = opts.companyId ? { companyId: opts.companyId } : {};
  const cars = await prisma.car.findMany({
    where,
    include: {
      _count: { select: { maintenanceEvents: true } },
    },
  });

  let created = 0;
  let carsTouched = 0;

  for (let i = 0; i < cars.length; i++) {
    const car = cars[i];
    if (car._count.maintenanceEvents > 0) continue;

    const pair = PAIRS[i % PAIRS.length];
    const older = monthsAgo(pair.olderMonths);
    const newer = monthsAgo(pair.newerMonths);
    const km = car.km ?? 0;
    const olderKm = Math.max(0, Math.floor(km - 8000 - (i % 5) * 400));
    const newerKm = Math.max(olderKm, Math.floor(km - 400 - (i % 3) * 100));

    await prisma.maintenanceEvent.createMany({
      data: [
        {
          companyId: car.companyId,
          carId: car.id,
          performedAt: older,
          mileageKm: olderKm,
          serviceType: pair.types[0],
          cost: pair.costs[0],
          notes: "Sample record (seed)",
        },
        {
          companyId: car.companyId,
          carId: car.id,
          performedAt: newer,
          mileageKm: newerKm,
          serviceType: pair.types[1],
          cost: pair.costs[1],
          notes: "Sample record (seed)",
        },
      ],
    });
    created += 2;
    carsTouched += 1;

    await prisma.car.update({
      where: { id: car.id },
      data: {
        lastServiceMileage: newerKm,
        lastServiceYearMonth: toYearMonth(newer),
      },
    });
  }

  return { created, carsTouched };
}

async function main() {
  const prisma = createPrismaForScripts();
  try {
    const companyId = process.env.COMPANY_ID?.trim() || undefined;
    console.log(
      companyId
        ? `Seeding maintenance for cars in company ${companyId} (only empty logs)...\n`
        : "Seeding maintenance for all cars in the database (only where log is empty)...\n",
    );

    const { created, carsTouched } = await ensureMaintenanceForCars(
      prisma,
      companyId ? { companyId } : {},
    );

    console.log(`Cars updated: ${carsTouched}, maintenance rows created: ${created}.`);
    if (carsTouched === 0) {
      console.log(
        "Nothing to do — every car already has at least one maintenance entry, or there are no cars.",
      );
    }
  } finally {
    await prisma.$disconnect();
  }
}

module.exports = { ensureMaintenanceForCars };

if (require.main === module) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
