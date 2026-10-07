# SpeakCoach

AI English speaking & interview coach for cybersecurity students.
React 19 + Vite + Tailwind 4 on the front end, Express + Gemini (streaming SSE) on the back end, Supabase for auth and persistence.

## Prerequisites

- Node.js >= 20
- A Gemini API key (Google AI Studio)
- A Supabase project (optional — the app falls back to browser-local demo data if it is not configured)

## Setup

```bash
npm install
cp .env.example .env
# edit .env and fill in your keys
npm run dev
```

The app is served at <http://localhost:3000> (`PORT` overrides this).
`npm run dev` starts Express and mounts Vite in middleware mode, so hot reload works out of the box.

| Command | What it does |
|---|---|
| `npm run dev` | Dev server (Express + Vite middleware) |
| `npm run build` | Production client bundle → `dist/` |
| `npm start` | Production server (serves `dist/`, `NODE_ENV=production`) |
| `npm run lint` | Type-check everything (`tsc --noEmit`) |
| `npm test` | Run the Vitest suite once |
| `npm run clean` | Remove `dist/` |

## Environment variables

Copy `.env.example` to `.env` and fill in real values. **Never commit `.env`.**

| Variable | Side | Required | Description |
|---|---|---|---|
| `GEMINI_API_KEY` | server | yes | Gemini API key. Used only inside `server.ts`; never exposed to the browser. |
| `GEMINI_MODELS` | server | no | Comma-separated fallback order, e.g. `gemini-2.5-flash,gemini-2.0-flash`. Defaults are verified against `ai.models.list()` at startup. |
| `APP_URL` | server | no | Public base URL (OAuth/magic-link redirects). |
| `PORT` | server | no | HTTP port (default `3000`). |
| `HOST` | server | no | Interface to bind. Dev defaults to localhost only (`127.0.0.1`); production binds all interfaces (`0.0.0.0`). |
| `TRUST_PROXY` | server | no | Number of proxies in front of the server (default `1`). Drives `express`'s `trust proxy` setting used by the rate limiter. |
| `ALLOW_DEMO_MODE` | server | no | `true` allows unauthenticated `/api/chat` requests **only when `NODE_ENV !== 'production'`**, using a demo profile. |
| `SUPABASE_URL` | server | no | Supabase project URL used by the server-side client (auth verification). |
| `SUPABASE_ANON_KEY` | server | no | Supabase anon key used by the server-side client. |
| `VITE_SUPABASE_URL` | client | no | Same project URL, bundled into the browser. |
| `VITE_SUPABASE_ANON_KEY` | client | no | Public anon key (safe by design — RLS protects data). |

If Supabase is not configured the app runs fully in-browser demo mode: data is stored in `localStorage` and stays in this browser.

## Database (Supabase)

Migrations live in `supabase/migrations/`. Apply them with the Supabase CLI:

```bash
supabase login
supabase link --project-ref <your-project-ref>
supabase db push
```

Or paste the migration file into **Supabase Dashboard → SQL Editor → New query → Run**.

The canonical migration is idempotent, so it is safe to run again on an existing project. See [`supabase/README.md`](supabase/README.md) for details and for regenerating TypeScript types.

## Deploy

1. Build and start on your host (any Node 20+ runtime: Fly.io, Render, Cloud Run, a VM):
   ```bash
   npm install
   npm run build
   npm start        # NODE_ENV=production tsx server.ts
   ```
2. Set `NODE_ENV=production` plus the server-side variables above in the host's secret store (`GEMINI_API_KEY`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `PORT`, `TRUST_PROXY`).
3. Keep `ALLOW_DEMO_MODE` unset in production — it is ignored there anyway.
4. Point `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` at your project at build time so the browser bundle can reach Supabase.
5. Put the service behind a TLS-terminating proxy and set `TRUST_PROXY` to the number of hops so rate limiting keys on real client IPs.

## Project layout

```
server.ts              Express app: auth, rate limiting, SSE chat streaming
server/prompt-loader.ts Single source of truth for the coach system prompt
coach-system-prompt.md  Base prompt template read by the server
src/                    React app (components, lib, types)
supabase/migrations/    Idempotent SQL migrations + RLS policies
tests/                  Vitest suites (prompt, SSE, rate limit, validation)
```
