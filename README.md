# Meskat Alam — Vibe Coder · Portfolio

A living portfolio: the background is a **real-time 3D rocket launch** built with raw
Three.js — no game engine, no video. Every frame you see is rendered by code, in your
browser, the moment you scroll it.

- Scroll = the flight: launch pad → ignition → MAX-Q through the real atmosphere
  layers → orbital rendezvous (two space stations, named satellites) → planet hop
  past **VERMILION · AURELIA · GLACIUS** → parking orbit with an ice moon.
- Click the nav insignia → **MISSION CONTROL** (live telemetry, measured from the flight).
- Press & hold the nav insignia → decrypts the **classified personnel file**.
- Press & hold the orange orb → wakes **ORION AI**, the site's onboard intelligence.
- Projects: **SYS·SCAN** (live device telemetry) and **ROCKET·TV** (a green-phosphor
  console that hand-types real Earth→Moon/Mars/Uranus/Neptune guidance code on loop).
- The skill solar system swells to fullscreen as you scroll into it, and docks back
  down as you scroll past.

## Tech

Next.js 16 · React 19 · TypeScript · Tailwind CSS 4 · Three.js (no engine) · Framer Motion

## Run locally

```bash
npm install
npm run dev          # http://localhost:3000
```

## Environment variables

Copy the example and fill in what you need:

```bash
cp .env.example .env
```

| Variable        | Required | What it does                                                              |
| --------------- | -------- | ------------------------------------------------------------------------- |
| `GROQ_API_KEY`  | no       | Powers **ORION AI** via Groq (the fastest engine). If it is missing, ORION automatically falls back to the built-in engine — the chat never goes down. |
| `GROQ_MODEL`    | no       | Override the Groq model. Default: `llama-3.1-8b-instant` (fast).            |

ORION never reveals which engine or key it runs on — that's by design.

## Deploy — GitHub + Vercel

1. **Push to GitHub**

   ```bash
   git init
   git add .
   git commit -m "portfolio: live rocket launch"
   git branch -M main
   git remote add origin https://github.com/<your-username>/<repo>.git
   git push -u origin main
   ```

   `.gitignore` already excludes `node_modules`, `.next` and `.env*` — your keys
   never get committed.

2. **Import on Vercel**

   - Go to [vercel.com/new](https://vercel.com/new) → **Import** the repository.
   - Framework preset is detected automatically (Next.js). The build command
     comes from the `vercel-build` script (`next build`) — no changes needed.
   - Under **Environment Variables**, add `GROQ_API_KEY` (paste your Groq key).
     Optional: `GROQ_MODEL`.
   - Click **Deploy**. Every future `git push` to `main` redeploys automatically;
     pull requests get their own preview URLs.

3. **That's it.** Custom domain (optional): Vercel → Settings → Domains.

## Notes

- The database files (`prisma/`, `db/`, `src/lib/db.ts`) are unused scaffolding —
  the site is fully static plus two API routes and deploys without any database.
- Mobile: pinch-zoom is disabled, layout is viewport-safe, scrollbar is hidden —
  the altitude meter is the progress indicator.
