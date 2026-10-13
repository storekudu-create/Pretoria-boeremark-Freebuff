# Private Market Map Demo (Cloudflare Workers + React PWA)

A private, independent prototype of a stall-finder PWA for a weekend market,
built on the real Pretoria Boeremark street reference (Moreleta St, Olienhoutlaan,
Wilgerlaan). **Not affiliated with or endorsed by Pretoria Boeremark.** All
businesses, vendors, products, prices and specials are fictional demo data.

## Stack

- **Frontend:** React 19 + Vite, plain CSS, EN/AF i18n, offline-first PWA
  (manifest, generated PNG icons, cache-first service worker with
  network-first `/api` data and localStorage fallback).
- **Backend:** Cloudflare Worker (Hono) serving the SPA behind a viewer
  password gate, JSON APIs, admin CRUD and demo analytics, backed by D1
  (SQLite) that self-seeds the demo dataset on first request.

## Roles & passwords (local dev)

Local secrets live in `.dev.vars` (gitignored):

- `ACCESS_PASSWORD` — viewer unlock for the whole app (demo-access)
- `ADMIN_PASSWORD` — admin dashboard login (demo-admin)
- `SESSION_SECRET` — HMAC secret for signed session cookies

In a deployment these are platform secrets (`SESSION_SECRET`,
`ACCESS_PASSWORD`, `ADMIN_PASSWORD`); never commit them. Rotation is done via
the hosting dashboard's secret store.

## Commands

```bash
npm ci
npm run build        # tsc --noEmit + vite build + stamp service worker
npm test             # vitest unit tests
npm run worker:dev   # wrangler dev on :8787 (needs a prior build for dist/)
npm run test:e2e     # playwright E2E against a running wrangler dev
npm run icons        # regenerate public/icons/*.png from scratch
```

### E2E in a container without system fonts/libs

Headless Chromium needs shared libraries and at least one font for keyboard
input. In this VM they were staged without root:

```bash
# libs extracted to ~/.local/chromelibs via `apt-get download` + dpkg -x
export LD_LIBRARY_PATH=$HOME/.local/chromelibs/usr/lib/x86_64-linux-gnu
export FONTCONFIG_FILE=$HOME/fonts.conf   # points at extracted DejaVu fonts
npx playwright install chromium
E2E_BASE_URL=http://127.0.0.1:8787 npx playwright test
```

Without `FONTCONFIG_FILE`, Chromium receives keystrokes but never commits
text, so `fill()` silently types nothing.

## Deployment

```bash
npm run build                       # produces dist/ + stamps build/worker.js
# bundle the Worker once (esbuild is already a devDependency):
npx esbuild worker/index.ts --bundle --format=esm --platform=neutral \
  --target=es2022 --outfile=build/worker.js
```

`deploy-manifest.json` describes the prebuilt upload:

- `modules`: the bundled `build/worker.js` as an ES module (`entrypoint: index.js`)
- `assetsDirectory`: `dist/` (the SPA, `sw.js`, `manifest.webmanifest`, `icons/`)
- `compatibilityDate`: `2025-10-01`

Provision a D1 database bound as `DB` for the environment **before** the first
deploy (the Worker self-creates its schema and seeds demo data on first
request), then set the three secrets (`SESSION_SECRET`, `ACCESS_PASSWORD`,
`ADMIN_PASSWORD`). Because the Worker runs before assets, the viewer gate
protects every HTML route on the deployed origin exactly as it does locally.

## Architecture notes

- `shared/` is isomorphic: seed data, search scoring, specials date logic,
  formatting and categories are used by both the Worker (seeding/API) and the
  React app (client search).
- The Worker runs before assets (`run_worker_first`), so every HTML request
  passes the viewer gate; unauthenticated visitors get a self-contained login
  page. `/api/data` and admin routes return 401 JSON without a session.
- Admin mutations reject cross-origin requests (`origin` must match host).
- Images are validated as data URLs or http(s) URLs before storage.
- Demo analytics records only coarse events (keyword/search, stall id) — no
  personal data.
