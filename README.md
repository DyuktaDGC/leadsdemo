# DGC Lead Tracker (demo)

Lead tracker for a small sales team. This is a standalone demo: no server, no sign in service, no Meta. Everything runs in the browser and is saved in localStorage, seeded with sample users, projects, campaigns and leads.

## Run

Needs Node 22 or newer.

```bash
npm install
npm run dev
```

Open http://localhost:5173 and pick someone to sign in as (owner or employee). **Reset demo data** on the sign in screen restores the sample data.

## Scripts

- `npm run dev` starts the dev server.
- `npm run build` type checks and builds to `dist` (static files, host anywhere).
- `npm run lint` runs ESLint.
- `npm run check` runs the lead rules self-check (`src/shared/lib/backend.check.ts`).
