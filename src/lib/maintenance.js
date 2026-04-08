/**
 * Maintenance history per vehicle (local DB).
 */

import { getTenantPrisma } from "@/lib/tenant-db";

/**
 * @param {string} companyId
 * @param {{ carId?: string }} [opts]
 */
export async function listMaintenanceEvents(companyId, opts = {}) {
  const prisma = await getTenantPrisma(companyId);
  return prisma.maintenanceEvent.findMany({
    where: {
      companyId,
      ...(opts.carId ? { carId: opts.carId } : {}),
    },
    include: {
      car: { select: { id: true, brand: true, model: true, registrationNumber: true } },
    },
    orderBy: { performedAt: "desc" },
  });
}

/**
 * @param {string} companyId
 * @param {string} carId
 * @param {{ performedAt: Date, mileageKm?: number|null, serviceType: string, cost?: number|null, notes?: string|null }} data
 */
export async function createMaintenanceEvent(companyId, carId, data) {
  const prisma = await getTenantPrisma(companyId);
  const car = await prisma.car.findFirst({
    where: { id: carId, companyId },
    select: { id: true },
  });
  if (!car) throw new Error("Car not found in this company");

  return prisma.maintenanceEvent.create({
    data: {
      companyId,
      carId,
      performedAt: data.performedAt,
      mileageKm: data.mileageKm ?? null,
      serviceType: data.serviceType.trim().slice(0, 120),
      cost: data.cost ?? null,
      notes: data.notes?.trim() || null,
    },
    include: {
      car: { select: { id: true, brand: true, model: true, registrationNumber: true } },
    },
  });
}

export async function deleteMaintenanceEvent(companyId, id) {
  const prisma = await getTenantPrisma(companyId);
  const row = await prisma.maintenanceEvent.findFirst({
    where: { id, companyId },
    select: { id: true },
  });
  if (!row) return null;
  await prisma.maintenanceEvent.delete({ where: { id } });
  return { ok: true };
}
