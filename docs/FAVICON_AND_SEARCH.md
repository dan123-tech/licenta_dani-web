# Favicon and logo in Google search results

Google shows a small icon next to your site name when it can **crawl a valid favicon** from your live site. A **generic globe** usually means Google has not yet associated a trusted icon with your URL, or it prefers a different format than what you expose.

## What this project already does

- **`src/app/icon.svg`** — Next.js App Router serves this as the site icon (you should see it in the browser tab on `companyfleetshare.com`).
- Next injects the correct `<link rel="icon" …>` tags automatically; you do **not** need to add those by hand unless you want extras (see below).

## What Google expects (practical checklist)

1. **Prefer a PNG favicon for Google**  
   Google’s guidelines favour a **square** icon, **at least 48×48 px** (multiples of 48 are fine, e.g. 96×96, 192×192, 512×512).  
   **SVG is supported in many browsers**, but **PNG is more consistently picked up** for the search results snippet icon.

2. **Add a PNG next to your SVG (recommended)**  
   - Export your logo as a **square** PNG (same artwork as the tab icon you want in Google).  
   - Save it as **`src/app/icon.png`** (same folder as `icon.svg`).  
   - Next.js will pick it up and expose it in metadata; deploy to production.

   If `icon.png` and `icon.svg` both exist, browsers and Google can use the PNG where it helps.

3. **Keep the icon crawlable**  
   - Must be reachable on **HTTPS** on **your canonical host** (same host as the page).  
   - Do not block `/icon.png` or `/icon.svg` in `robots.txt`.  
   - Avoid requiring authentication for the icon URL.

4. **Wait for Google to refresh**  
   After deploy, the SERP icon can take **days to weeks** to update. Use **Google Search Console** → **URL inspection** on your homepage → **Request indexing** after you deploy the PNG.

5. **Optional: Apple touch icon**  
   For home-screen bookmarks on iOS, add **`src/app/apple-icon.png`** (180×180 is common). This does not replace Google’s favicon rules but improves icons on devices.

## Quick verification

- Open `https://companyfleetshare.com` in a browser — tab should show your icon (SVG or PNG).  
- Open `https://companyfleetshare.com/icon.svg` and, after you add it, `https://companyfleetshare.com/icon.png` — both should return **200** without login.

## If the globe persists

- Confirm production is deployed with **`icon.png`** present.  
- Check **Search Console** → **Enhancements** / **Page indexing** for crawl issues.  
- Ensure **one canonical domain** (e.g. always `https` and consistent `www` vs apex) so Google fetches the same favicon everywhere.

---

*Official reference: [Google Search Central — Define a favicon](https://developers.google.com/search/docs/appearance/favicon-in-search)*
