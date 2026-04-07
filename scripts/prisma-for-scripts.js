/**
 * PrismaClient for Node seed/migration scripts — matches src/lib/db.js (Neon adapter + ws).
 * Plain `new PrismaClient()` fails when schema uses engineType = "client" with Neon.
 */

const { PrismaClient } = require("@prisma/client");
const { PrismaNeon } = require("@prisma/adapter-neon");
const { neonConfig } = require("@neondatabase/serverless");

function normalizeNeonConnectionString(url) {
  try {
    const u = new URL(url);
    u.searchParams.delete("channel_binding");
    return u.toString();
  } catch {
    return url;
  }
}

function shouldUseNeonAdapter(url) {
  if (!url) return false;
  if (process.env.PRISMA_NEON_ADAPTER === "0") return false;
  if (process.env.PRISMA_NEON_ADAPTER === "1") return true;
  return /neon\.tech/i.test(url);
}

function configureNeonDriver() {
  if (typeof globalThis.WebSocket !== "undefined") return;
  try {
    const ws = require("ws");
    neonConfig.webSocketConstructor = ws;
  } catch {
    /* ignore */
  }
}

/**
 * @returns {import("@prisma/client").PrismaClient}
 */
function createPrismaForScripts() {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) {
    throw new Error("DATABASE_URL is not set (load .env before calling createPrismaForScripts)");
  }
  if (!process.env.DATABASE_URL) process.env.DATABASE_URL = url;

  if (shouldUseNeonAdapter(url)) {
    const normalized = normalizeNeonConnectionString(url);
    configureNeonDriver();
    const adapter = new PrismaNeon({ connectionString: normalized });
    return new PrismaClient({ adapter });
  }
  return new PrismaClient();
}

module.exports = { createPrismaForScripts };
