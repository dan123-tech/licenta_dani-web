# FleetShare — Security documentation (web application)

This file is the **canonical inventory** of security-related behaviour shipped in this repository. **[README.md](README.md)** covers project setup and env vars at a glance; this document goes deeper on controls. Implementation lives mainly in `src/middleware.js`, `src/lib/security/`, `src/lib/auth/`, and `src/lib/api-helpers.js`. When in doubt, verify against source.

---

## Table of contents

1. [Secrets and environment variables](#1-secrets-and-environment-variables)  
2. [Authentication](#2-authentication)  
3. [Sessions and cookies](#3-sessions-and-cookies)  
4. [Authorization and tenancy](#4-authorization-and-tenancy)  
5. [Rate limiting](#5-rate-limiting)  
6. [Account lockout (failed passwords)](#6-account-lockout-failed-passwords)  
7. [CSRF and trusted origins](#7-csrf-and-trusted-origins)  
8. [CORS](#8-cors)  
9. [HTTP security headers and CSP](#9-http-security-headers-and-csp)  
10. [Cron and automation endpoints](#10-cron-and-automation-endpoints)  
11. [Dashboard client protections](#11-dashboard-client-protections)  
12. [Identity verification and mobile capture](#12-identity-verification-and-mobile-capture)  
13. [Sensitive data and storage](#13-sensitive-data-and-storage)  
14. [Public and ancillary endpoints](#14-public-and-ancillary-endpoints)  
15. [Audit logging](#15-audit-logging)  
16. [Supply chain and CI](#16-supply-chain-and-ci)  
17. [Reporting vulnerabilities](#17-reporting-vulnerabilities)

---

## 1. Secrets and environment variables

| Rule | Detail |
| --- | --- |
| **No secrets in `NEXT_PUBLIC_*`** | Values with this prefix are embedded in browser bundles. Use server-only variables for database URLs, `AUTH_SECRET`, API keys, Resend keys, Neon keys, cron secrets, etc. |
| **`AUTH_SECRET`** | Required for signing session cookies, MFA OTP HMAC, and AES-256-GCM encryption helpers. Must be **at least 32 characters** where enforced (e.g. MFA helpers). Rotate after any suspected leak; redeploy; users re-authenticate. |
| **Database URLs** | `DATABASE_URL` / `DIRECT_URL` — rotate credentials at the provider after incidents; update all environments. |
| **Least privilege** | Prefer a dedicated migration role for `prisma migrate` and a narrower DB user for runtime where your host allows it. |

---

## 2. Authentication

| Control | Detail |
| --- | --- |
| **Password storage** | **bcrypt** (`bcryptjs`), salt rounds **10** — `src/lib/auth/password.js`. |
| **Login / register / MFA and Origin** | `assertTrustedRequestOrigin` (`src/lib/security/csrf.js`) on `POST /api/auth/login`, `POST /api/auth/register`, `POST /api/auth/mfa-verify`, `POST /api/auth/set-password`, `POST /api/users/me/password` to reduce cross-site credential posting. |
| **Email MFA** | Six-digit codes; HMAC-SHA256 with a secret derived from `AUTH_SECRET` (`src/lib/auth/mfa-otp.js`). TTL **10 minutes** (`MFA_OTP_TTL_MS`). Maximum **5** verification attempts per flow (`MFA_MAX_ATTEMPTS`). Verification uses **timing-safe** comparison for the hash. |
| **Forced password change** | Users can be flagged `mustChangePassword` (e.g. after invite). Dashboard shows `MustChangePasswordOverlay` until password is changed; API clears the flag on successful change (`/api/users/me/password`, set-password flow). |

---

## 3. Sessions and cookies

| Control | Detail |
| --- | --- |
| **Session transport** | **HTTP-only** cookie (`httpOnly: true`), **SameSite=Lax**, **Secure** when the request is treated as HTTPS (`src/lib/auth/session.js`). |
| **HTTPS detection** | Uses request URL, `cf-visitor`, `x-forwarded-proto`, `forwarded`, `x-forwarded-ssl`, and `VERCEL=1` heuristics so cookies are marked Secure behind TLS-terminating proxies. **`FORCE_HTTPS_SESSION_COOKIE=1`** forces Secure cookie binding when headers are wrong. |
| **Payload** | Cookie carries signed payload: `userId`, `email`, `name`, `companyId`, `role`, `client` (`web` \| `mobile`), `sid` (per-channel session id). |
| **Per-channel session tokens** | Stored on `User`: `activeWebSessionToken` / `activeMobileSessionToken`. **Login rotates** the token for that channel so other browsers/tabs on the same channel lose validity (`src/lib/auth/session-tokens.js`). |
| **Cookie name** | Production HTTPS may use `__Host-car_sharing_session` or legacy `car_sharing_session` depending on binding; dev uses legacy name without Secure. |
| **Max age** | Session cookie **7 days** (`MAX_AGE` in `session.js`). |

---

## 4. Authorization and tenancy

| Control | Detail |
| --- | --- |
| **Session required** | Most fleet APIs use `requireSession` / `requireCompany` / `requireAdmin` from `src/lib/api-helpers.js` (and related helpers) so actions run only for authenticated users with correct company and role. |
| **Company-scoped data** | Operations resolve `companyId` to a **tenant database** (Neon per company) via `src/lib/tenant-db.js`; cross-tenant access is avoided by design at the data layer. |
| **Admin-only routes** | Car deletes, RCA uploads, user admin APIs, etc. check admin role where applicable. |

---

## 5. Rate limiting

### 5.1 Auth endpoints (`src/lib/security/rate-limit-auth.js`)

| Bucket | Purpose | Defaults (env overridable) |
| --- | --- | --- |
| **Failed login / MFA** | Per **IP** and per **normalized email** counters in a sliding window | `AUTH_RATE_LIMIT_WINDOW_SEC` (default **900** s), `AUTH_RATE_LOGIN_FAIL_IP_MAX` (**10**), `AUTH_RATE_LOGIN_FAIL_EMAIL_MAX` (**25**) |
| **Register** | Per **IP** and per **email** | `AUTH_RATE_REGISTER_IP_MAX` (**20**), `AUTH_RATE_REGISTER_EMAIL_MAX` (**8**) |
| **Storage** | Prefer **Cloudflare KV** binding `RATE_LIMIT_KV` on Workers; else **Postgres** table `AuthRateLimit` (requires migrations). | `AUTH_RATE_LIMIT_ENABLED=0` disables |

`recordLoginAuthFailure` / `assertLoginAuthNotRateLimited` are wired from `src/app/api/auth/login/route.js` and `src/app/api/auth/mfa-verify/route.js`. Register uses `assertRegisterIpNotRateLimited`, `recordRegisterPostAttempt`, `assertRegisterEmailNotRateLimited`, `recordRegisterEmailAttempt`.

### 5.2 Global API rate limit (`src/lib/security/middleware-ip-rate-limit.js`)

- Applied in **`src/middleware.js`** for all **`/api/*`** requests except **`OPTIONS`**.
- **Fixed 60 s window**, default **120 requests/minute/IP** in production (`API_RATE_LIMIT_PER_MINUTE`). **`API_RATE_LIMIT_ENABLED=0`** disables; **`1`** forces on in non-production too.
- **In-memory per serverless isolate** — not a global cluster limit; use CDN/WAF or Redis for strict global caps.
- Client IP from **`CF-Connecting-IP`**, **`X-Real-IP`**, or first hop of **`X-Forwarded-For`** (`src/lib/security/client-ip.js`).

### 5.3 Mobile identity capture links (`src/lib/mobile-capture-sessions.js`)

- Limits how many **mobile capture sessions** a user can create per window (default **3 per 5 minutes** per user).
- Env: `MOBILE_CAPTURE_RATE_LIMIT_WINDOW_MINUTES`, `MOBILE_CAPTURE_RATE_LIMIT_MAX`, `MOBILE_CAPTURE_SESSION_TTL_MINUTES` (default **15** min link TTL).

---

## 6. Account lockout (failed passwords)

| Item | Detail |
| --- | --- |
| **Implementation** | `src/lib/security/login-lockout.js` |
| **Threshold** | After **`LOGIN_LOCKOUT_MAX_ATTEMPTS`** failed attempts (default **5**), account blocked for **`LOGIN_LOCKOUT_MINUTES`** (default **15**). |
| **Persistence** | `User.loginFailedAttempts`, `User.loginLockedUntil` on the **control** database. |
| **Logging** | Each failure emits a **structured JSON line** to stderr (`event: "login_failure"`, reason, email, userId, IP, attempt count). Lockout emits `reason: "account_locked"`. |
| **Clear** | Successful password verification clears failures **before** MFA (`clearPasswordLoginFailures`). |

---

## 7. CSRF and trusted origins

| Item | Detail |
| --- | --- |
| **Core helper** | `assertTrustedRequestOrigin` in `src/lib/security/csrf.js` |
| **Rules** | Allows `Origin` or `Referer` that matches the **app origin** or **`CORS_ALLOWED_ORIGINS`** / **`NEXT_PUBLIC_APP_URL`** list (`getCorsAllowedOrigins`). If both `Origin` and `Referer` are absent, request is allowed (non-browser clients) — **session or other auth still required** on protected routes. |
| **Mutations** | `requireTrustedOriginForMutation` in `src/lib/api-helpers.js` returns **403** if the check fails. Used on cookie-backed **`POST` / `PATCH` / `DELETE`** fleet APIs (cars, reservations, users, maintenance, incidents, companies, logout, notifications, MFA enrollment, identity mobile session, AI helpbot chat, etc.). |

---

## 8. CORS

| Item | Detail |
| --- | --- |
| **Implementation** | `src/lib/security/cors.js`, applied in **`src/middleware.js`** for `/api/*` |
| **Allow list** | `CORS_ALLOWED_ORIGINS` (comma-separated origins), or fallback **`NEXT_PUBLIC_APP_URL`** as a single origin. |
| **Behaviour** | Echoes **`Access-Control-Allow-Origin`** only for allow-listed **`Origin`**; credentials allowed for that origin. **Preflight** sets methods and headers including **`X-Web-Session-Id`**, **`X-Client-Type`**, **`X-Requested-With`**, **`Content-Type`**, **`Authorization`**. |
| **Non-API pages** | CORS headers stripped on non-`/api` responses in middleware. |

---

## 9. HTTP security headers and CSP

### 9.1 Next.js config (`next.config.mjs`)

- **`poweredByHeader: false`** (hides `X-Powered-By`).
- **`productionBrowserSourceMaps: false`** (no public browser source maps in production).
- Global headers: **Referrer-Policy**, **X-Content-Type-Options: nosniff**, **X-Frame-Options: DENY**, **X-DNS-Prefetch-Control: off**, **Permissions-Policy** (camera **self** only; microphone/geolocation denied), **COOP/CORP same-origin**.
- **Cache-Control: no-store** on `/`, `/login`, `/register`, `/privacy`.
- **HSTS** is **not** duplicated here; see middleware.

### 9.2 Middleware (`src/middleware.js`)

| Header | Value / notes |
| --- | --- |
| **Content-Security-Policy** | `default-src 'self'`; `base-uri 'self'`; `form-action 'self'`; `frame-ancestors 'none'` (or **`'self'`** for glovebox/vignette document API routes so same-origin viewers work); `frame-src 'self' https:`; `worker-src 'self'`; `object-src 'none'`; `img-src 'self' data: blob: https:`; `font-src 'self' data: https:`; `style-src 'self' 'unsafe-inline' https:`; `script-src 'self' 'unsafe-inline' https:`; `connect-src 'self' https: wss:`; `upgrade-insecure-requests`. Optional **`report-uri`** to `CSP_REPORT_URI` or **`/api/csp-report`**. **`CSP_REPORT_ONLY=1`** sends **Content-Security-Policy-Report-Only** instead of enforcing CSP. |
| **X-Frame-Options** | **DENY** except **SAMEORIGIN** for glovebox/vignette document routes. |
| **X-Content-Type-Options** | **nosniff** |
| **Referrer-Policy** | **strict-origin-when-cross-origin** |
| **Permissions-Policy** | **camera=(self), microphone=(), geolocation=()** |
| **Cross-Origin-Resource-Policy** | **same-origin** |
| **Cross-Origin-Opener-Policy** | **same-origin** |
| **HSTS** | **`max-age=31536000; includeSubDomains`** for HTTPS requests unless **`DISABLE_HSTS=1`** (e.g. local HTTP). |
| **Cache-Control** | **no-store** on non-API **GET/HEAD** responses. |

### 9.3 CSP report endpoint

- **`POST /api/csp-report`** (`src/app/api/csp-report/route.js`) — accepts browser CSP reports, logs truncated JSON, returns **204**.

---

## 10. Cron and automation endpoints

Routes under **`/api/cron/*`** (ITP, RCA, vignette expiry reminders, reservation push reminders) require a shared secret:

- **`Authorization: Bearer <CRON_SECRET>`** or header **`x-cron-secret`**.
- If `CRON_SECRET` is unset, routes respond with configuration errors.

These endpoints **do not** use the browser CSRF origin check; they rely on the **secret**.

---

## 11. Dashboard client protections

| Control | Detail |
| --- | --- |
| **Idle sign-out** | `WebIdleLogout` — after **`NEXT_PUBLIC_WEB_IDLE_LOGOUT_MINUTES`** (default **30**) without pointer/keyboard/scroll/touch activity on **`/dashboard`**, client logs out and redirects. |
| **Session live guard** | `WebSessionLiveGuard` — periodic **`/api/auth/session`** while tab visible; **401** → redirect to login (`?expired=1`). Avoids logging out on transient network errors. |
| **Multi-tab coherence** | `BroadcastChannel` / events when another tab logs in or session is revoked (`WEB_AUTH_BROADCAST`, `WEB_SESSION_LOST_EVENT`); global fetch hook in `src/lib/api.js` surfaces **401** for API calls. |

---

## 12. Identity verification and mobile capture

| Control | Detail |
| --- | --- |
| **Driving licence & selfie** | Uploaded via authenticated APIs; storage may be local under `public/uploads/…` (gitignored) or **Vercel Blob** private URLs depending on configuration. |
| **Face match** | External AI services (env-configured URLs); verification flow in `src/lib/identity-verification.js` and related routes. |
| **Mobile capture flow** | Time-limited token in DB; **GET** validates token and returns metadata; **POST** requires **`requireTrustedOriginForMutation`** and processes live scan with rate limits above. |

---

## 13. Sensitive data and storage

| Control | Detail |
| --- | --- |
| **Encrypt helper** | **AES-256-GCM** for sensitive configuration (e.g. data source credentials), key derived from **`AUTH_SECRET`** (`src/lib/encrypt.js`). |
| **Uploads** | `public/uploads` is **gitignored**; do not commit user files. |
| **Contact form** | **`POST /api/contact`** — field length limits; HTML email body uses **`escapeEmailText`** to reduce injection into outbound mail (`src/lib/email.js`). |
| **HTML escaping** | `src/lib/security/escape-html.js` for user-controlled strings where used. |

---

## 14. Public and ancillary endpoints

| Item | Detail |
| --- | --- |
| **`public/.well-known/security.txt`** | Security contact placeholder; update **`Contact:`** for your organisation. |
| **`/api-docs`** | API documentation UI (intended for operators / developers). Treat exposure accordingly in production (network access, auth if you add any). |
| **`/api/openapi`** | OpenAPI document for the HTTP API. |

---

## 15. Audit logging

| Item | Detail |
| --- | --- |
| **Helper** | `writeAuditLog` in `src/lib/audit.js` |
| **Model** | Append-only **`AuditLog`** rows (company-scoped): actor, action, entity type/id, optional JSON **`meta`**. Failures are logged to console and **do not** fail the primary request. |

---

## 16. Supply chain and CI

| Item | Detail |
| --- | --- |
| **Dependabot** | `.github/dependabot.yml` — grouped npm updates. |
| **Security audit workflow** | `.github/workflows/security-audit.yml` — **`npm audit --audit-level=critical`**. |

---

## 17. Reporting vulnerabilities

Please **do not** post exploit details in public GitHub issues before a fix is available.

1. Open a **[GitHub Security Advisory](https://github.com/dan123-tech/CompanyFleetShare/security/advisories/new)** (private), if enabled, **or**  
2. Contact maintainers through your agreed production / project channel.

Include: affected component, steps to reproduce, impact, and version/commit if known.

---

## Supported versions

Security fixes land on the default branch (**`main`**) and follow your deployment process. Pin or tag releases in your own environments if you need long-lived support lines.
