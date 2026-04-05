/**
 * Prisma client for the app.
 *
 * OpenNext on Cloudflare fills `process.env` from Worker `env` at request start, but some
 * code paths can still see an empty `DATABASE_URL` first. We resolve the URL from Worker
 * `env` via `getCloudflareContext()` when needed, then create the client lazily on first use.
 *
 * Neon on Workers: `@prisma/adapter-neon` when the URL looks like Neon (or PRISMA_NEON_ADAPTER=1).
 */

import { createRequire } from "node:module";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { PrismaClient } from "@prisma/client";
import { neonConfig } from "@neondatabase/serverless";
import { PrismaNeon } from "@prisma/adapter-neon";

const globalForPrisma = globalThis;

/**
 * Pooled Neon URL from process.env or, on Workers, from the current request `env` binding.
 */
function resolveDatabaseUrl() {
  const fromProcess = process.env.DATABASE_URL?.trim();
  if (fromProcess) return fromProcess;
  try {
    const workerEnv = getCloudflareContext().env;
    const raw = workerEnv?.DATABASE_URL;
    if (typeof raw === "string" && raw.trim()) {
      const v = raw.trim();
      process.env.DATABASE_URL = v;
      return v;
    }
    const hyper = workerEnv?.HYPERDRIVE;
    if (hyper && typeof hyper.connectionString === "string" && hyper.connectionString.trim()) {
      const v = hyper.connectionString.trim();
      process.env.DATABASE_URL = v;
      return v;
    }
  } catch {
    /* Not inside a Cloudflare request (e.g. next build, plain Node). */
  }
  return "";
}

/** @param {string} url */
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
    const require = createRequire(import.meta.url);
    const ws = require("ws");
    neonConfig.webSocketConstructor = ws;
  } catch {
    /* Workerd provides WebSocket. */
  }
}

function createPrismaClient() {
  const log = process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"];
  const url = resolveDatabaseUrl();

  if (!url) {
    throw new Error(
      "DATABASE_URL is not set. For Cloudflare Workers: Workers & Pages → your worker → Settings → Variables and secrets → add DATABASE_URL (Neon pooled string), or run: npx wrangler secret put DATABASE_URL"
    );
  }

  if (!process.env.DATABASE_URL) {
    process.env.DATABASE_URL = url;
  }

  if (shouldUseNeonAdapter(url)) {
    const normalized = normalizeNeonConnectionString(url);
    configureNeonDriver();
    const adapter = new PrismaNeon({ connectionString: normalized });
    return new PrismaClient({ adapter, log });
  }

  return new PrismaClient({ log });
}

function getClient() {
  globalForPrisma.__prisma_singleton ??= createPrismaClient();
  return globalForPrisma.__prisma_singleton;
}

/**
 * Lazy proxy so Prisma is created after env is available.
 * @type {import("@prisma/client").PrismaClient}
 */
export const prisma = new Proxy(
  {},
  {
    get(_target, prop) {
      const client = getClient();
      const value = Reflect.get(client, prop, client);
      if (typeof value === "function") {
        return value.bind(client);
      }
      return value;
    },
  }
);

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
