# Company Car Sharing — Web edition

Next.js + **PostgreSQL only** (Prisma). Intended for **Vercel** + a hosted database (Neon, Supabase, Vercel Postgres, etc.).

This repo **does not** ship Database Settings or external data sources (no Microsoft Entra / SSO integration for user directories, no SQL Server / Firebase / SharePoint as app data layers).

The **full thesis / server edition** (orchestrator + SSO-capable layers, Docker-focused) is the sibling project **`licenta_dani-main`** — keep that as your main Git repo; use **this** folder as a **separate Git repository** for the public web demo.

## New Git remote (you run once)

```bash
cd path/to/licenta_dani-web
git init
git add -A
git commit --trailer "Made-with: Cursor" -m "Initial commit: web edition (PostgreSQL only)"
git branch -M main
git remote add origin https://github.com/YOUR_USER/licenta-dani-web.git
git push -u origin main
```

## Environment

```bash
cp .env.example .env
```

Set **`DATABASE_URL`**, **`AUTH_SECRET`** (32+ chars), **`NEXT_PUBLIC_APP_URL`**, and **`NEXTAUTH_URL`** (production URL). See `.env.example`.

## Vercel

`vercel.json` runs `prisma migrate deploy` then `npm run build`. Add the same env vars in the Vercel project (including `DATABASE_URL` for the build).

## Local dev

```bash
npm install
npx prisma migrate dev
npm run dev
```

API docs: http://localhost:3000/api-docs

## More documentation

See the `docs/` folder (copied from the main project). Ignore SQL Server / multi–data-source sections for this edition.
