# OpportunityAI Workspace

## Overview

A hackathon-grade student opportunity prioritizer. Paste raw emails → AI extracts structured data → deterministic scoring engine ranks by student profile fit → results with explanations, risk alerts, and next steps.

**Frontend**: Svelte 5 + Vite 7 + Tailwind CSS v4 (no React — Tauri-ready)  
**Backend**: Express 5 + TypeScript  
**Database**: PostgreSQL + Drizzle ORM  
**AI**: Gemini 2.5 Flash via Replit AI Integrations

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)
- **Frontend**: Svelte 5 + Vite 7 + Tailwind v4

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally
- `pnpm --filter @workspace/opportunity-ai run dev` — run Svelte frontend

## Architecture

### Scoring Formula
```
score = type_match (30) + skill_match (25) + eligibility (20) + deadline_urgency (15) + location (5) + completeness (5) = 100
```

### API Routes
- `GET/PUT /api/profile` — student profile
- `POST /api/extract` — extract + score + save opportunities from emails
- `GET/DELETE /api/opportunities` — list or clear saved results

### Key Files
- `artifacts/api-server/src/lib/scoring.ts` — deterministic scoring engine
- `artifacts/api-server/src/lib/gemini-extract.ts` — AI extraction via Gemini
- `lib/db/src/schema/opportunities.ts` — database schema
- `lib/api-spec/openapi.yaml` — API contract

## Phase Reports
- `PHASE_1_REPORT.md` — Core structure, stack decisions
- `PHASE_2_REPORT.md` — AI extraction layer
- `PHASE_3_REPORT.md` — Scoring engine
- `PHASE_4_REPORT.md` — Results dashboard & Svelte UI

## Tauri Notes
Frontend compiles to `dist/public/` — point Tauri's `distDir` there. Replace `/api` base URL with localhost port for embedded mode.
