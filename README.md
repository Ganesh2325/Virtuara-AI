# Virtuara AI

Virtuara AI is a personal learning platform. A learner signs in, tells the product who they are, chooses subjects, and studies with **ARIA** — a subject-aware tutor that remembers the conversation, uses documents the learner uploads, and adjusts explanation depth to beginner, intermediate, or advanced.

This repository contains the full product: a Next.js web app and a Django REST API.

**Repository:** [github.com/Ganesh2325/Virtuara-AI](https://github.com/Ganesh2325/Virtuara-AI)

---

## What you can do today

| Area | What it does |
| --- | --- |
| **Accounts** | Email signup, login, JWT sessions, email verification, password reset, optional Google sign-in |
| **Onboarding** | Name, age group, a short “about you”, subject picks, custom subject names, and education level |
| **Personal subjects** | Platform catalogue (Mathematics, Physics, Chemistry, Biology, History, Literature, Computer Science, Economics) plus **private custom subjects** that only that user can see |
| **ARIA tutor** | Streaming chat tied to the active subject, conversation history, and level-aware teaching language |
| **Knowledge** | Upload PDF, TXT, Markdown, or CSV (up to 5 MB) or paste notes; ARIA retrieves overlapping passages and can cite them |
| **Mathematics path** | Seeded algebra objective, resources, and practice questions for structured study |
| **Mock interviews** | Resume upload, question turns, abort, and a written report |
| **Progress** | Sessions, history, achievements, and a settings profile that shows the stored name, age, level, and goals |
| **Subscriptions** | Plan catalogue from the API (billing is modelled, not a live payment processor in local setup) |

ARIA’s teaching level is stored on the learner profile. Beginner answers use everyday language and one idea at a time. Intermediate answers use correct terms with a short explanation. Advanced answers stay precise and do not oversimplify.

---

## How the product is structured

```
virtuaraai-main/                 Next.js 14 app (UI)
virtuaraai-backend/              Django 5 API, Celery, Docker Compose
```

| Layer | Stack |
| --- | --- |
| Web app | Next.js 14, React 18, TypeScript, Tailwind CSS, NextAuth |
| API | Django 5, Django REST Framework, SimpleJWT |
| Database | PostgreSQL 16 |
| Cache and jobs | Redis 7, Celery |
| AI text | Server-side provider: Groq, OpenAI, or any OpenAI-compatible endpoint |
| Docs | Swagger at `/api/docs/` and ReDoc at `/api/redoc/` |

The browser never holds the text-provider API key. Keys live only in `virtuaraai-backend/.env`, which is gitignored.

### Request flow

1. The learner uses the dashboard at the Next.js app.
2. Next.js calls `NEXT_PUBLIC_API_URL` (Docker maps the API to **http://localhost:8001**).
3. Django authenticates with JWT, loads the user profile and visible subjects, and may retrieve knowledge chunks.
4. For tutor turns, Django calls the configured text provider and streams structured JSON back to the UI.

---

## Honest current limits

These are intentional boundaries, not hidden features:

- Document retrieval is **keyword overlap**, not vector embeddings.
- Supported uploads are **PDF, TXT, Markdown, and CSV**. Images, OCR, DOCX, and XLSX are not ingested.
- Live web research stays off unless `VIRTUARA_SEARCH_API_KEY` is set. Private, loopback, and link-local URLs are rejected.
- Spoken input uses the **browser speech APIs**. There is no WebRTC barge-in or MetaHuman avatar in this codebase.
- Inline diagrams are structured blocks in the tutor response, not generated images.

---

## Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (PostgreSQL, Redis, API, Celery)
- Node.js 20 or newer
- A Groq or OpenAI API key for tutor replies (keep it in the backend `.env` only)

---

## Local setup

### 1. Clone

```bash
git clone https://github.com/Ganesh2325/Virtuara-AI.git
cd Virtuara-AI
```

### 2. Backend (Docker)

```bash
cd virtuaraai-backend
copy .env.example .env
```

On macOS or Linux use `cp .env.example .env`.

Edit `.env` and set at least:

```env
SECRET_KEY=change-me
DEBUG=True
FRONTEND_URL=http://localhost:3001
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001,http://localhost:3002

VIRTUARA_TEXT_PROVIDER=groq
VIRTUARA_TEXT_PROVIDER_API_KEY=your-key-here
VIRTUARA_TEXT_PROVIDER_MODEL=openai/gpt-oss-20b
```

`npm run dev` in this repo binds the UI to **port 3001**. Include that origin in `CORS_ALLOWED_ORIGINS`.

Start services:

```bash
docker compose up --build
```

In another terminal, apply schema and seed the catalogue:

```bash
docker compose exec api python manage.py migrate
docker compose exec api python manage.py seed
```

The API is then available at **http://localhost:8001**. Interactive docs: **http://localhost:8001/api/docs/**

The seed command creates platform subjects, a Mathematics algebra path, subscription plans, and (only when `DEBUG` is true) a development admin. Change that password before any shared environment.

### 3. Frontend

```bash
cd virtuaraai-main
npm install
```

Create `virtuaraai-main/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:8001
```

Start the app:

```bash
npm run dev
```

Open **http://localhost:3001**. Sign up, complete onboarding, then open the dashboard.

---

## Typical first session

1. Create an account at `/signup` and verify email if SMTP is configured (`DEBUG` may relax this locally).
2. Onboarding stores **name, age group, about you, subjects, custom subjects, and level**.
3. The dashboard shows **that user’s** subjects only — custom names never appear on other accounts.
4. Open a subject and talk to ARIA. Attach a small PDF or notes if you want answers grounded in your material.
5. End a session to see the session summary. Profile details stay visible under **Settings**.
6. Add more private subjects later from **Subjects**. Follow a catalogue subject with the follow action.

---

## Environment variables

### Backend (`virtuaraai-backend/.env`)

| Variable | Purpose |
| --- | --- |
| `SECRET_KEY` | Django secret |
| `DEBUG` | Development mode |
| `DATABASE_URL` | Overridden inside Compose to the `db` service |
| `REDIS_URL` / `CELERY_*` | Cache and workers |
| `FRONTEND_URL` | Links in verification and reset emails |
| `CORS_ALLOWED_ORIGINS` | Browser origins allowed to call the API |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Optional Google OAuth |
| `VIRTUARA_TEXT_PROVIDER` | `groq`, `openai`, or `openai-compatible` |
| `VIRTUARA_TEXT_PROVIDER_API_KEY` | Server-only provider key |
| `VIRTUARA_TEXT_PROVIDER_MODEL` | Model id |
| `VIRTUARA_SEARCH_API_KEY` | Optional; without it, live research returns unavailable |

Never commit `.env` files or provider keys.

### Frontend (`virtuaraai-main/.env.local`)

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_API_URL` | Django origin. Use `http://localhost:8001` with Docker Compose |

---

## API surface (v1)

| Prefix | Responsibility |
| --- | --- |
| `/api/v1/auth/` | Registration, JWT, profile, onboarding |
| `/api/v1/subjects/` | Catalogue, custom subjects, follow |
| `/api/v1/sessions/` | Learning sessions and messages |
| `/api/v1/voice/` | ARIA turns, SSE stream, conversation list |
| `/api/v1/knowledge/` | Uploads, listing, research boundary |
| `/api/v1/interviews/` | Resume, interview turns, report |
| `/api/v1/subscriptions/` | Plans |
| `/api/v1/health/` | Liveness and readiness |

---

## Tests

From `virtuaraai-backend` with Compose running:

```bash
docker compose exec api python manage.py test apps.knowledge apps.voice apps.sessions.tests apps.interviews
```

Frontend:

```bash
cd virtuaraai-main
npm run lint
npm run build
```

---

## Project layout

```
virtuaraai-backend/
  apps/accounts/       Users, profiles, onboarding
  apps/subjects/       Catalogue, ownership, custom subjects
  apps/sessions/       Tutoring sessions and provider adapters
  apps/voice/          ARIA conversations and streaming turns
  apps/knowledge/      Ingest, retrieve, research URL checks
  apps/interviews/     Mock interviews
  apps/subscriptions/  Plans
  config/              Django settings, URLs, Celery
  docker-compose.yml

virtuaraai-main/
  app/(auth)/          Login, signup, verify, reset
  app/(onboarding)/    First-run profile and subjects
  app/(marketing)/     Public landing pages
  app/dashboard/       Tutor, subjects, interview, settings, history
  components/aria/     Streaming client and display blocks
  lib/api.ts           Typed API client
```

Internal backend notes live in `BACKEND_TECHNICAL_DOC.md`. Prefer this README for setup; treat that file as older architecture notes where it disagrees with current apps such as `knowledge` and custom subjects.

---

## Security notes

- Keep provider keys on the API server only.
- Custom subjects are owner-scoped; other users receive 404 for those records.
- Knowledge sources are owner-scoped. Deletes are owner-only.
- Research URLs must be public HTTP(S). Localhost and private networks are blocked.

---

## License

No license file is published in this repository yet. All rights reserved by the authors unless a license is added.
