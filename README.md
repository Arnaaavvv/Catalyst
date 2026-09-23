# ⚡ Catalyst

**Health, Habits, Goals, Tasks, and Academics — one connected system, not four separate apps.**

[![Next.js](https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=next.js&logoColor=white)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=black)](https://supabase.com)
[![Gemini API](https://img.shields.io/badge/Gemini_API-8E75B2?style=for-the-badge&logo=googlegemini&logoColor=white)](https://ai.google.dev)
[![Vercel](https://img.shields.io/badge/Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white)](https://vercel.com)

---

Most productivity apps make you choose: a habit tracker, a task manager, a goal board, a grade log. Catalyst treats them as one graph instead of four silos — a habit feeds a goal, a goal is made of tasks, a task belongs to a subject, and your health metrics sit next to all of it because none of the rest works if you're not sleeping.

It's built for one user currently, which is a feature, not a limitation — no multi-tenant compromises, no generic settings nobody needs, no feature flags for edge cases that will never happen.

## 🔴 Live Demo

**[Try it here](https://catalyst-track.vercel.app/)**

Sign up, and your Today view, Goals map, and Academics module are ready to go — no seed data required to see it work.

## ✨ Features

- **📅 Today view** — a single daily surface: tasks due, habits to check off, and what's linked to what
- **🌌 Goals constellation map** — goals rendered as a node graph, band heights scaled to how many habits/tasks actually feed each one, so nothing collides regardless of how lopsided your goals are
- **⚡ Quick Add** — type a sentence, Gemini parses it into a typed task/habit/event; falls back to a local regex parser if no API key is set, so it never just breaks
- **📈 Life Pulse & Momentum Dials** — rolling visualizations of how health, habits, and goals are trending, not just static snapshots
- **🎓 Academics** — subjects, assignments, and grades live in the same data model as everything else
- **🌗 Dark mode** — applied at the document root with a blocking anti-flash script, so there's no light-mode flash on load

## 🛠 Tech Stack

| Layer | Stack |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack) + TypeScript |
| Styling | Tailwind CSS, Lucide icons |
| Backend | Supabase (Postgres, Auth, Row Level Security) |
| AI parsing | Gemini API, server-side, with a local regex fallback |
| Hosting | Vercel |

## 🚀 Getting Started

```bash
git clone https://github.com/Arnaaavvv/catalyst.git
cd catalyst
npm install
```

Create `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
GEMINI_API_KEY=your-gemini-key   # optional — falls back to regex parsing if omitted
```

Run the schema (`supabase/schema.sql`) in your Supabase project's SQL editor.
Then:

```bash
npm run dev
```

Open `http://localhost:3000`.

## 📁 Project Structure

```
catalyst/
├── app/              # routes, layouts, API handlers (app/api/parse for Quick Add)
├── components/       # typed UI components — modals render via a shared Portal
├── hooks/            # state + data hooks
├── lib/              # supabaseClient, parsing utilities, shared logic
└── supabase/
    └── schema.sql    # tables, RLS policies, grants
```

## ⚠️ Limitations

- Built and tuned for single-user use — there's no multi-tenant workspace model.
- Quick Add parsing quality depends on the sentence structure you give it; the regex fallback covers common phrasing but isn't a substitute for the Gemini path.
- Username uniqueness enforcement is mid-migration from `user_metadata` to a dedicated `profiles` table — collisions aren't fully guarded yet.

## ☁️ Deployment

Live in production on Vercel, with Supabase handling Postgres, Auth, and Row Level Security. 

---
*One system. Every part of your day, actually connected.*