# OpportunityAI — AI-Powered Email Opportunity Ranker

<p align="center">
  <strong>Paste your emails → AI extracts opportunities → Get ranked results matched to your profile</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Svelte-5-FF3E00?style=flat-square&logo=svelte" />
  <img src="https://img.shields.io/badge/Node.js-Express-339933?style=flat-square&logo=node.js" />
  <img src="https://img.shields.io/badge/Firestore-Database-FFCA28?style=flat-square&logo=firebase" />
  <img src="https://img.shields.io/badge/AI-OpenRouter-7C3AED?style=flat-square" />
</p>

---

## ✨ Features

- **AI Email Extraction** — Paste raw emails and the AI (Nemotron 120B via OpenRouter) extracts structured opportunities (internships, scholarships, hackathons, jobs, etc.)
- **Parallel Processing** — 3 API keys process emails concurrently for 3× speed
- **Deduplication** — SHA-256 hashing prevents duplicate emails from being processed twice
- **100-Point Scoring Engine** — Deterministic scoring matches opportunities to your student profile across 6 dimensions (type, skills, eligibility, urgency, location, completeness)
- **Identity-Based Data Isolation** — Each user only sees their own profile and opportunities
- **Progressive Disclosure UI** — Clean, distraction-free interface that reveals details on demand
- **Opportunity Inbox** — Results are merged/appended, building a growing inbox over time

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────┐
│               Frontend (Svelte 5)           │
│  localhost:5173                              │
│  ┌──────┐ ┌──────┐ ┌───────┐ ┌──────────┐  │
│  │Login │ │Home  │ │Results│ │ Profile  │  │
│  └──────┘ └──────┘ └───────┘ └──────────┘  │
└────────────────────┬────────────────────────┘
                     │ HTTP / SSE
┌────────────────────▼────────────────────────┐
│             Backend (Express)               │
│  localhost:8080                              │
│  ┌──────┐ ┌────────┐ ┌───────┐ ┌────────┐  │
│  │Auth  │ │Extract │ │Profile│ │Opps    │  │
│  └──────┘ └───┬────┘ └───────┘ └────────┘  │
│               │                              │
│  ┌────────────▼─────────────┐               │
│  │  Parallel Worker Pool    │               │
│  │  (3 OpenRouter API Keys) │               │
│  └──────────────────────────┘               │
└────────────────────┬────────────────────────┘
                     │ REST
┌────────────────────▼────────────────────────┐
│           Firestore (Google Cloud)          │
│  ┌───────┐ ┌──────────────┐ ┌───────────┐  │
│  │users  │ │opportunities │ │ profiles  │  │
│  └───────┘ └──────────────┘ └───────────┘  │
└─────────────────────────────────────────────┘
```

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** ≥ 18
- **pnpm** (`npm install -g pnpm`)
- A **Google Cloud Firestore** project with an API key
- **OpenRouter API keys** (free tier works — get them at [openrouter.ai](https://openrouter.ai))

### 1. Clone & Install

```bash
git clone https://github.com/YOUR_USERNAME/OpportunityAI.git
cd OpportunityAI
pnpm install
```

### 2. Configure Environment

Copy the example and fill in your keys:

```bash
cp .env.example .env
```

Edit `.env`:

```env
# Required — Firestore REST API key
FIRESTORE_API_KEY=your_firestore_api_key_here

# Required — OpenRouter API keys (at least 1, up to 3 for parallel processing)
OPENROUTER_KEY_1=sk-or-v1-...
OPENROUTER_KEY_2=sk-or-v1-...
OPENROUTER_KEY_3=sk-or-v1-...

# Server ports (defaults shown)
PORT=8080
```

### 3. Run

**Start the API server:**

```bash
cd artifacts/api-server
pnpm run build && pnpm run start
```

**Start the frontend (new terminal):**

```bash
cd artifacts/opportunity-ai
pnpm run dev
```

Open → [http://localhost:5173](http://localhost:5173)

---

## 📖 Usage Guide

### 1. Create an Account
Click **Get Started** → enter a username and password → you're in.

### 2. Set Up Your Profile
Go to **Profile** → fill in your degree, semester, CGPA, skills, interests, and preferred opportunity types. This personalizes your scoring.

### 3. Analyze Emails
Go to **Analyze** → paste raw email text (or use the sample) → click **Detect & Preview** → click **Analyze All**.

The AI processes each email in parallel and streams results live. You'll see:
- ✓ Extracted opportunities with scores
- ✕ Filtered-out emails (marketing, rejections, etc.)

### 4. View Your Inbox
Go to **Inbox** → see all your opportunities ranked by fit score. Click any card to expand and see:
- Score breakdown (6 dimensions)
- Why it ranked high
- Risk alerts & missing items
- Next steps checklist
- Original source email
- Apply link

---

## 🧩 Project Structure

```
├── artifacts/
│   ├── api-server/          # Express backend
│   │   └── src/
│   │       ├── routes/
│   │       │   ├── auth.ts          # Login & Register
│   │       │   ├── extract.ts       # Email extraction (parallel + dedup)
│   │       │   ├── profile.ts       # Student profile CRUD
│   │       │   └── opportunities.ts # Opportunity inbox
│   │       └── lib/
│   │           ├── firestore.ts     # Firestore REST client
│   │           ├── gemini-extract.ts# OpenRouter AI integration
│   │           └── scoring.ts       # 100-point scoring engine
│   │
│   └── opportunity-ai/     # Svelte 5 frontend
│       └── src/
│           ├── pages/
│           │   ├── Login.svelte
│           │   ├── Register.svelte
│           │   ├── Home.svelte      # Email input + live streaming
│           │   ├── Results.svelte   # Progressive disclosure inbox
│           │   └── Profile.svelte   # Student profile form
│           ├── components/
│           │   └── Nav.svelte       # Frosted glass navigation
│           └── lib/
│               ├── api.ts           # Identity-scoped API client
│               └── types.ts         # TypeScript interfaces
│
└── lib/                     # Shared zod schemas
```

---

## 🔒 Security

- **Passwords** are hashed with `scrypt` (Node.js native `crypto`) with random 16-byte salts
- **Timing-safe comparison** via `crypto.timingSafeEqual` prevents timing attacks
- **Data isolation** — every API call is scoped to the logged-in user's `profileId`
- **No external auth dependencies** — zero attack surface from third-party auth libraries

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Svelte 5, Tailwind CSS v4, Vite |
| Backend | Node.js, Express, TypeScript |
| Database | Google Cloud Firestore (REST API) |
| AI Model | `nvidia/nemotron-3-super-120b-a12b:free` via OpenRouter |
| Auth | Native `crypto.scryptSync` (no bcrypt needed) |
| Build | esbuild, pnpm workspaces |

---

## 📄 License

MIT — see [LICENSE](LICENSE) for details.
