# DGC (demo)

A copy of the DGC lead tracker that runs entirely in the browser on mock data. No Supabase, no Google Sheet, no Meta.

- The real backend (`backend/Code.gs`) runs in the browser against an in-memory sheet (`src/shared/lib/mockServer.ts`), saved in localStorage and seeded with sample users, projects, campaigns, leads and calls.
- Sign in is faked (`src/shared/lib/supabase.ts`). Every account's password is `demo1234`. Continue with Google signs in as the owner.
- While Meta is connected, new mock leads from the running campaigns arrive every 15 minutes.

To start over, clear the site's localStorage.

## Run

Needs Node 22 or newer.

```bash
npm install
npm run dev
```

Open http://localhost:5173 and pick a demo account (owner or employee).

## Scripts

- `npm run dev` starts the dev server.
- `npm run build` type checks and builds to `dist` (static files, host anywhere).
- `npm run lint` runs ESLint.
- `npm test` runs the backend checks against an in-memory sheet.
