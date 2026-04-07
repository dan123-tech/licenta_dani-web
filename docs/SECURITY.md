# Security notes (FleetShare web)

For **deploying to the web**, environment variables, and Git workflow, see **`WEB_HOSTING_GUIDE.md`**.

## SQL injection (SQLi)

- **PostgreSQL (default):** The app uses **Prisma**. Queries are **parameterized**; user input is not concatenated into SQL strings for the main data layer.
- **SQL Server (optional connector):** Updates use **`mssql` `.input()` parameters** (`@Name`, `@Email`, …). Dynamic parts are fixed column names in code, not user-controlled SQL fragments. Table names come from **admin configuration**; treat that config as trusted (only admins can change it).

Do not replace Prisma or parameterized `mssql` calls with string-built SQL using end-user input.

## Cross-site scripting (XSS)

- **React** escapes text in JSX by default.
- Places that render **HTML strings** (e.g. AI chat markdown) use **HTML escaping** and **safe link URL checks** before rendering.
- **Content Security Policy** is enabled with a baseline policy in production (see `next.config.mjs` and `src/middleware.js`). `script-src` / `style-src` include `'unsafe-inline'` where required for Next.js; primary XSS defense remains React escaping and safe rendering for rich content.

## CSRF (API)

- JSON login/register and related auth endpoints validate **`Origin` / `Referer`** against the deployed origin (and `CORS_ALLOWED_ORIGINS` / `NEXT_PUBLIC_APP_URL`). See `src/lib/security/csrf.js` and **`IMPLEMENTATION_LOG.md` §3.3**.

## CORS

- By default, browser calls from **the same site** as the app do not need CORS.
- For **other origins** (mobile app, another hostname, local dev), set:
  - **`CORS_ALLOWED_ORIGINS`** — comma-separated list, e.g. `https://www.companyfleetshare.com,https://companyfleetshare.com`
  - Or rely on **`NEXT_PUBLIC_APP_URL`** as a **single** allowed origin when `CORS_ALLOWED_ORIGINS` is unset.

Credentials (`cookies`) require an explicit origin (not `*`). Preflight `OPTIONS` is handled in middleware for `/api/*`.

## Related headers (middleware + Next config)

Production responses set CSP, `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`, cross-origin policies, and HSTS when appropriate. See `src/middleware.js`, `next.config.mjs`, and **`IMPLEMENTATION_LOG.md`** for the full list.

## Next hardening ideas (recommended backlog)

1. **Rate limiting (critical auth + invite endpoints)**
   - Add per-IP and per-account throttling for `/api/auth/*`, invite creation/accept, and password reset/2FA verification paths.
   - Consider stricter burst + daily quotas for admin-only mutation endpoints.

2. **Stronger session and cookie controls**
   - Keep `Secure`, `HttpOnly`, `SameSite=Lax/Strict`, and add short idle timeout + absolute max session lifetime.
   - Rotate session identifiers after privilege changes (e.g., role changes, password reset).

3. **MFA step-up for sensitive admin actions**
   - Require recent re-auth or MFA challenge before deleting data, changing company-level settings, or rotating feed tokens.

4. **Audit logging expansion**
   - Record immutable actor/action/resource logs for maintenance create/delete, role changes, invite operations, and security setting updates.
   - Include request metadata (timestamp, user id, company id, source IP/user agent where legally appropriate).

5. **Input validation unification**
   - Enforce schema validation (`zod`) for all API payloads (length limits, enum checks, numeric ranges, date sanity checks).
   - Reject unknown fields by default to reduce accidental mass-assignment style bugs.

6. **CSP tightening plan**
   - Move toward nonce-based CSP and remove `'unsafe-inline'` where feasible.
   - Add violation reporting endpoint (report-only mode first) to tune policy safely.

7. **Secrets and credential hygiene**
   - Rotate `AUTH_SECRET`, email/API keys, and DB credentials on a schedule.
   - Add CI secret scanning and pre-commit checks for accidental `.env` leakage.

8. **Dependency and supply-chain controls**
   - Enable automated dependency updates and lockfile review policy.
   - Run `npm audit`/SCA in CI with severity gates and documented exception workflow.
