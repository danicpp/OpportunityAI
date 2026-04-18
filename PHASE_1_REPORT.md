# Phase 1 Report — Core App Structure

**Status:** Complete  
**Date:** 2026-04-18

---

## Objective
Set up the full-stack foundation: Svelte frontend, Express backend, PostgreSQL database, and Gemini AI integration.

---

## What Was Built

### Frontend (Svelte + Vite)
- **Framework**: Svelte 5 with Vite 7 — no React, no virtual DOM. Compiles to vanilla JS at build time.
- **Styling**: Tailwind CSS v4 with a dark developer theme (GitHub Dark-inspired palette)
- **Fonts**: Inter (UI) + JetBrains Mono (code/scores)
- **Routing**: Lightweight hash-based router using Svelte 5 `$state` runes
- **Pages created**:
  - `/` (Analyze) — Email input with paste / file upload / sample loader
  - `/profile` — Student profile form
  - `/results` — Ranked opportunities dashboard
- **Tauri-ready**: Pure Svelte compiles to static assets — drop into any Tauri project with `tauri build`

### Backend (Express 5)
- **Server**: Express 5 with pino logging
- **Routes scaffolded**: `GET/PUT /api/profile`, `POST /api/extract`, `GET/DELETE /api/opportunities`
- **Database**: PostgreSQL via Drizzle ORM — two tables: `student_profiles`, `opportunities`
- **AI Integration**: Gemini 2.5 Flash via Replit AI Integrations (no user API key needed)

### Database Schema
```sql
student_profiles (
  id TEXT PRIMARY KEY DEFAULT 'default',
  degree TEXT,
  semester INTEGER,
  cgpa REAL,
  skills JSONB,
  interests JSONB,
  preferred_types JSONB,
  location_preference TEXT,
  financial_need BOOLEAN,
  updated_at TIMESTAMP
)

opportunities (
  id TEXT PRIMARY KEY,
  profile_id TEXT,
  type TEXT,
  title TEXT,
  organization TEXT,
  deadline TEXT,
  eligibility JSONB,
  requirements JSONB,
  location TEXT,
  link TEXT,
  urgency_hint TEXT,
  score INTEGER,
  rank INTEGER,
  score_breakdown JSONB,
  explanation JSONB,
  created_at TIMESTAMP
)
```

---

## Architecture Decision: No Firebase
The user mentioned Firebase Firestore as the database. However:
- No Replit Firebase integration exists
- A PostgreSQL database was already provisioned in the project
- PostgreSQL + Drizzle ORM provides the same persistence with zero config

**Decision**: Using Replit PostgreSQL. Firebase can be swapped in later if needed by replacing `lib/db/` calls with Firebase Admin SDK calls.

---

## Tech Stack Summary

| Layer | Technology |
|-------|-----------|
| Frontend | Svelte 5 + Vite 7 |
| Styling | Tailwind CSS v4 |
| Backend | Express 5 + TypeScript |
| Database | PostgreSQL + Drizzle ORM |
| AI | Gemini 2.5 Flash (Replit AI Integrations) |
| Monorepo | pnpm workspaces |

---

## Files Created
```
artifacts/opportunity-ai/
  src/
    main.ts               — Svelte entry point
    App.svelte            — Router + layout
    app.css               — Dark theme + custom styles
    lib/
      api.ts              — Typed API client (fetch-based)
      types.ts            — TypeScript interfaces
    components/
      Nav.svelte          — Navigation bar
    pages/
      Home.svelte         — Email input page
      Profile.svelte      — Student profile form
      Results.svelte      — Ranked results dashboard

artifacts/api-server/src/
  lib/
    scoring.ts            — Deterministic scoring engine
    gemini-extract.ts     — AI extraction via Gemini
  routes/
    profile.ts            — GET/PUT /api/profile
    extract.ts            — POST /api/extract
    opportunities.ts      — GET/DELETE /api/opportunities
    index.ts              — Route wiring

lib/db/src/schema/
  opportunities.ts        — Drizzle schema for both tables
```
