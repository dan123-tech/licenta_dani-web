/**
 * Vercel build entrypoint.
 *
 * We prefer to run `prisma migrate deploy` during the build, but DB connectivity
 * can be unavailable (paused DB, networking, missing env vars) which would
 * otherwise fail the whole deployment.
 *
 * Behavior:
 * - If VERCEL_RUN_MIGRATIONS=1 => migrations are REQUIRED (fail build on error)
 * - Otherwise => try migrations, but continue the build if migrations fail
 */
const { execSync } = require("child_process");

function env(name) {
  return (process.env[name] || "").trim();
}

function run(cmd, { required } = { required: true }) {
  try {
    execSync(cmd, { stdio: "inherit" });
    return true;
  } catch (e) {
    if (required) throw e;
    return false;
  }
}

const requireMigrations = env("VERCEL_RUN_MIGRATIONS") === "1";

// Only attempt migrations if Prisma has a URL to connect with.
const hasDbUrl = Boolean(env("DATABASE_URL") || env("DIRECT_URL"));

if (!hasDbUrl) {
  console.log("[vercel-build] No DATABASE_URL/DIRECT_URL set — skipping prisma migrate deploy");
} else {
  console.log(`[vercel-build] prisma migrate deploy (${requireMigrations ? "required" : "best-effort"})`);
  const ok = run("npx prisma migrate deploy", { required: requireMigrations });
  if (!ok) {
    console.log("[vercel-build] prisma migrate deploy failed — continuing build (set VERCEL_RUN_MIGRATIONS=1 to enforce)");
  }
}

console.log("[vercel-build] next build");
run("npm run build", { required: true });

