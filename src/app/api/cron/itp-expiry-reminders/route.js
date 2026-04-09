/**
 * POST /api/cron/itp-expiry-reminders
 * Email admins about upcoming/expired ITP dates per car.
 * Protected by CRON_SECRET. Schedule daily (e.g. Vercel Cron).
 *
 * Header: Authorization: Bearer <CRON_SECRET>
 */
import { prisma as controlPrisma } from "@/lib/db";
import { getTenantPrisma } from "@/lib/tenant-db";
import { sendItpAutoBlockedAdminEmail, sendItpExpiryAdminEmail } from "@/lib/email";

function unauthorized() {
  return new Response(JSON.stringify({ error: "Unauthorized" }), {
    status: 401,
    headers: { "Content-Type": "application/json" },
  });
}

function dayStart(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export async function POST(request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return new Response(JSON.stringify({ error: "CRON_SECRET not configured" }), {
      status: 503,
      headers: { "Content-Type": "application/json" },
    });
  }
  const auth = request.headers.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : request.headers.get("x-cron-secret");
  if (token !== secret) return unauthorized();

  const reminderDays = Math.max(0, parseInt(process.env.ITP_REMINDER_DAYS || "30", 10) || 30);
  const autoBlock = String(process.env.ITP_AUTO_BLOCK_EXPIRED || "true").toLowerCase() !== "false";
  const now = new Date();
  const today = dayStart(now);
  const cutoff = new Date(today.getTime() + reminderDays * 24 * 60 * 60 * 1000);

  const companies = await controlPrisma.company.findMany({
    select: { id: true, name: true },
  });

  let emailedCompanies = 0;
  let carsFlagged = 0;
  let carsAutoBlocked = 0;
  const errors = [];

  for (const c of companies) {
    try {
      const tenant = await getTenantPrisma(c.id);
      const cars = await tenant.car.findMany({
        where: {
          companyId: c.id,
          itpExpiresAt: { not: null, lte: cutoff },
        },
        select: {
          id: true,
          brand: true,
          model: true,
          registrationNumber: true,
          status: true,
          itpExpiresAt: true,
          itpLastNotifiedAt: true,
        },
        orderBy: { itpExpiresAt: "asc" },
      });

      if (!cars.length) continue;

      const expiredNow = cars.filter((car) => {
        if (!autoBlock) return false;
        if (!car.itpExpiresAt) return false;
        const exp = dayStart(new Date(car.itpExpiresAt));
        return exp.getTime() < today.getTime();
      });

      const toNotify = cars.filter((car) => {
        if (!car.itpExpiresAt) return false;
        // Send at most once per day per car.
        if (!car.itpLastNotifiedAt) return true;
        return dayStart(car.itpLastNotifiedAt).getTime() < today.getTime();
      });

      const admins = await tenant.companyMember.findMany({
        where: {
          companyId: c.id,
          role: "ADMIN",
          status: "ENROLLED",
        },
        include: { user: { select: { email: true, name: true } } },
      });
      const to = admins.map((m) => m.user?.email).filter(Boolean);
      if (!to.length) continue;

      // Auto-block expired ITP cars by switching them to IN_MAINTENANCE.
      // Only block cars that are currently AVAILABLE so we don't break active bookings.
      const toBlock = expiredNow.filter((x) => (x.status || "").toUpperCase() === "AVAILABLE");
      if (toBlock.length) {
        const ids = toBlock.map((x) => x.id);
        await tenant.car.updateMany({
          where: { id: { in: ids }, companyId: c.id, status: "AVAILABLE" },
          data: { status: "IN_MAINTENANCE" },
        });
        carsAutoBlocked += toBlock.length;
        await sendItpAutoBlockedAdminEmail({
          to,
          companyName: c.name,
          cars: toBlock.map((car) => ({
            carId: car.id,
            label: [car.brand, car.model, car.registrationNumber].filter(Boolean).join(" "),
            expiresAt: new Date(car.itpExpiresAt).toISOString(),
          })),
        }).catch(() => {});
      }

      if (!toNotify.length) continue;

      const payloadCars = toNotify.map((car) => {
        const exp = new Date(car.itpExpiresAt);
        const days = Math.ceil((dayStart(exp).getTime() - today.getTime()) / (24 * 60 * 60 * 1000));
        return {
          carId: car.id,
          label: [car.brand, car.model, car.registrationNumber].filter(Boolean).join(" "),
          expiresAt: exp.toISOString(),
          daysUntil: days,
        };
      });

      const sendRes = await sendItpExpiryAdminEmail({
        to,
        companyName: c.name,
        cars: payloadCars,
        reminderDays,
      });

      if (sendRes?.ok) {
        emailedCompanies += 1;
        carsFlagged += payloadCars.length;
        const ids = toNotify.map((x) => x.id);
        await tenant.car.updateMany({
          where: { id: { in: ids }, companyId: c.id },
          data: { itpLastNotifiedAt: now },
        });
      }
    } catch (err) {
      errors.push({ companyId: c.id, error: err?.message || String(err) });
    }
  }

  return Response.json({ ok: true, reminderDays, emailedCompanies, carsFlagged, carsAutoBlocked, autoBlock, errors });
}

