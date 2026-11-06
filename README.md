# Mobile Garage & Auto Diagnostics

Two separate Vercel projects from one repo:

| Folder   | What it is | Database role |
|----------|------------|---------------|
| `site/`  | Public website. Server-rendered HTML from the database (indexable), service pages at `/services/<slug>`, booking form, sitemap. | `mgarage_web`: reads published content, files bookings through `mgarage.submit_booking()` only |
| `admin/` | Owner console (React + Vite). Slides, services and their photo sliders, photo library, reviews, FAQ, contact, hours, homepage text, announcement bar, SEO, booking requests, admin users. Not linked from the website; `noindex`. | `mgarage_api`: owns schema `mgarage` |

Data lives in schema `mgarage` of the Fpesa Supabase project (`mrsxvdxaoogamhkdqejp`), reached through the transaction pooler. Photos are stored in Postgres (`mgarage.images`) and served by the site at `/img/<id>` with a one-year immutable cache; the admin resizes and compresses them in the browser before upload.

## Environment

**site**: `DATABASE_URL` (pooler, port 6543, user `mgarage_web.<ref>`), `IP_SALT`, optional `SITE_URL`.

**admin**: `DATABASE_URL` (pooler, user `mgarage_api.<ref>`), `SESSION_SECRET` (32+ chars), `ADMIN_SETUP_TOKEN`, `SITE_URL` (for the "View website" link).

Secrets are kept in `.local/secrets.json` (git-ignored) and in each Vercel project's environment.

## First sign-in

Open the admin URL. While no admin exists it shows **Create the owner account**, which needs `ADMIN_SETUP_TOKEN`. After that, only sign-in is offered; more admins are added under Account › Admin users.

## Local development

```bash
npm install && npm --prefix site install && npm --prefix admin install
node scripts/dev.mjs site 5310          # website on http://localhost:5310
node scripts/dev.mjs admin 5321         # admin API
npm --prefix admin run dev              # admin UI on http://localhost:5320 (proxies /api to 5321)
node scripts/smoke.mjs                  # end-to-end test of both apps (needs an empty admin table)
```

`scripts/seed.mjs` loaded the first content (from the Google Maps listing) and refuses to run again once content exists. `db/schema.sql` and `db/web-grants.sql` document the schema; the roles were created by migration `mgarage_role_and_schema`.

## Deploy

```bash
cd site && vercel deploy --prod --yes
cd admin && vercel deploy --prod --yes
```

Website pages are cached at the edge for about 45 seconds, so admin edits appear on the site within a minute.
