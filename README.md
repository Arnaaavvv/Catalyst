# Catalyst

A personal operating system — Health, Habits, Goals, Tasks, and Academics — in one
connected product, not a pile of dashboards. Built with Next.js 16 (App Router,
Turbopack), React 18, TypeScript, and Tailwind.

## Quick start

```bash
npm install
npm run dev
```

Open http://localhost:3000, sign up, and you're in — a seeded demo dataset loads
automatically so the app feels alive on first login.

## How data & accounts work (read this)

**There is no backend database.** Accounts and data live entirely in this
browser's cache (`localStorage`):

- **Sign up / log in** creates a local profile on this device. Passwords are
  salted and hashed (SHA-256 via the Web Crypto API) before they touch storage —
  but this is *not* server-verified auth. There's no password reset, no
  cross-device sync, and anyone with access to this browser profile can see the
  account list (not the passwords). Don't reuse a sensitive password.
- **Your tracked data** (tasks, habits, goals, health logs, academics) is stored
  under a per-user key in `localStorage`, so switching accounts on the same
  device cleanly switches datasets.
- Clearing site data / browser cache **permanently deletes everything**. This
  is by design (you asked for cache-based storage), but it's worth knowing.
- If you outgrow this, `lib/storage.ts` and `lib/auth.ts` are the only two
  files that talk to `localStorage` — swapping them for real API calls to a
  server + database is the entire migration path; nothing else in the app
  needs to change.

## Natural-language Quick Add

`⌘K` / `Ctrl+K` opens the command palette. Typing something like
*"Study physics for 45 minutes tomorrow"* and hitting Enter sends it to a
server route (`app/api/parse/route.ts`) that calls the Gemini API to turn it
into structured fields, shown to you for confirmation before anything is
saved. This requires a free API key:

```bash
cp .env.example .env.local
# then edit .env.local and set:
# GEMINI_API_KEY=AIza...
```

Get a key at [aistudio.google.com/apikey](https://aistudio.google.com/apikey) —
no billing setup needed for the free tier. Restart `npm run dev` after adding it.

**Without a key, Quick Add still works** — it falls back automatically to a
local heuristic parser (`lib/quickadd.ts`, regex-based, runs entirely in the
browser). The AI path is a nice-to-have, not a dependency.

The manual quick-add types (Task / Habit / Health / Goal / Assignment / Study
session) in the same palette never touch the network at all.

## Project structure

```
app/
  page.tsx              → renders the root <App/>
  layout.tsx, globals.css → design tokens, fonts, global styles
  api/parse/route.ts    → server-side NL parsing (holds the API key)
lib/
  types.ts              → all shared data shapes
  seed.ts                → realistic demo data generator
  derived.ts             → momentum, streaks, timeline — all computed, nothing duplicated
  domains.ts              → domain colors/icons/nav config
  date.ts, quickadd.ts, quickAddTypes.ts
  auth.ts                → local sign-up/login (hash + localStorage)
  storage.ts              → per-user localStorage read/write
hooks/
  useLifeOSStore.ts      → the single state tree + all mutating actions
components/
  App.tsx                → auth gate + shell + view router
  auth/AuthScreen.tsx
  layout/                → NavRail, MobileNav, TopBar
  shared/                 → MomentumDial, LifePulse, Sparkline, primitives
  quickadd/CommandPalette.tsx
  views/                  → Today, Health, Habits, Goals, Tasks, Academics, Insights, Timeline
```

## Design concepts specific to this app

- **Life Pulse** — an EKG-style strip, one lane per domain, where a completed
  habit/task/health log/milestone/study session shows up as a heartbeat spike
  on its day.
- **Momentum Dial** — a real needle gauge (not a progress bar): *accelerating /
  steady / recovering / stalled*, computed by comparing a trailing window
  against the window before it — per domain and per goal.
- **Constellation Map** (Goals) — goals as orbiting bodies sized by milestone
  completion, linked habits/tasks as satellites, dashed threads connecting them.
- **Timeline** — a vertical ledger grouped by day rather than a flat activity log.

## Notes on the TypeScript conversion

This started as a single-file interactive prototype and was rebuilt here as a
properly modular Next.js project — typed data model, one state tree with pure
derived-data functions (no duplicated calculations across views), and a real
client/server boundary for the one feature (NL parsing) that needs a secret key.
