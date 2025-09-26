# CodeQuotient AI Interview Platform

## Overview
This monorepo hosts CodeQuotient's AI-led interview tooling: an Express + MongoDB backend that orchestrates interview lifecycles, and a React + Vite frontend that hiring teams use to design interviews and guide candidates through AI-driven sessions. Redis keeps session and chat state, Google Gemini powers interviewer responses and reporting, and Mailjet-compatible email flows handle candidate outreach.

## Highlights
- Unified APIs under `backend/` for interview definitions, candidate management, AI conversations, and reporting (`/api/v1/*`).
- Rich frontend under `frontend/` with authentication, interview authoring, candidate cohorts, and the AI interview room featuring Monaco-based code prompts.
- Environment-driven configuration with hot reload support, optional background worker for transcripts/report generation, and Docker Compose stacks for both services.
- Shared Creative Commons BY-NC-SA 4.0 licensing and consistent contribution guidelines across the stack.

## Repository Structure
```
.
├── backend/   # Express API, worker jobs, Redis/Mongo integrations, Docker setup
├── frontend/  # React + TypeScript client (Vite), Tailwind UI system, Docker setup
└── README.md  # Project-level documentation (this file)
```
Refer to `backend/README.md` and `frontend/README.md` for service-specific details.

## Tech Stack
- **Backend:** Node.js 18+, Express, Mongoose, ioredis, Google Generative AI SDK, Nodemailer, Pino logging.
- **Frontend:** React 18, TypeScript, Vite 6, React Router v7, TanStack Query, Zustand, Tailwind CSS, shadcn/ui.
- **Infrastructure:** Redis, MongoDB, Docker Compose (per service) with sample `.env` templates.

## Prerequisites
- Node.js 18.18 or newer and `pnpm` ≥ 9 (npm or yarn work with updated lockfiles).
- Docker + Docker Compose for container workflows (optional).
- Access to supporting services: MongoDB, Redis, Google AI Studio key, Mail provider credentials.

## Local Development
1. **Clone & enter the repository** (already done if you are reading this file).
2. **Seed environment variables**
   ```bash
   cp backend/.env.example backend/.env
   cp frontend/.env.example frontend/.env
   ```
   Update `backend/.env` with session, database, Redis, Google, and email secrets. Set the frontend URLs (`VITE_MAIN_SERVER_URL`, `VITE_AUTH_URL`) to point at your running backend.
3. **Install dependencies**
   ```bash
   pnpm install --filter ./backend...
   pnpm install --filter ./frontend...
   ```
   Alternatively run `pnpm install` inside each subfolder.
4. **Start the backend API + worker**
   ```bash
   cd backend
   pnpm dev
   ```
   The API defaults to `http://localhost:4004` with `/api/v1` routes.
5. **Start the frontend client** (in a new terminal)
   ```bash
   cd frontend
   pnpm dev
   ```
   Vite serves the client at `http://localhost:5173` and proxies API calls using the URLs in `.env`.

## Docker Workflow
Each service ships its own Compose file:
- **Backend:** change into `backend/`, supply `.env`, then run `docker compose up -d` or `pnpm compose:up`. The stack starts the API, MongoDB, and Redis; the API is published on port `4004`.
- **Frontend:** change into `frontend/`, ensure `.env` is configured, and run `docker compose up --build`. The web app defaults to `http://localhost:8000` and expects the backend URL from `VITE_MAIN_SERVER_URL`.
Stop services with `docker compose down` (add `-v` to clear volumes when desired).

## Environment Configuration
Key variables are documented in the `.env.example` files. Common values include:
- `backend/.env`: `SESSION_SECRET`, Redis host/port/password, `MONGO_CONNECTION_STRING`, `AI_MODEL_KEY`, Mail credentials, optional `CURRENT_HOST` for invite links.
- `frontend/.env`: `VITE_MAIN_SERVER_URL` for interview APIs, `VITE_AUTH_URL` for auth endpoints, optional Google OAuth client ID.

## Useful Scripts
| Location | Command | Purpose |
| --- | --- | --- |
| backend | `pnpm dev` | Run API with nodemon, worker enabled, pretty logs. |
| backend | `pnpm start` | Launch API with Node (no live reload). |
| backend | `pnpm compose:up` / `pnpm compose:down` | Manage Docker stack with `.docker.env`. |
| frontend | `pnpm dev` | Run Vite dev server with HMR. |
| frontend | `pnpm build` | Type-check and build production bundle into `dist/`. |
| frontend | `pnpm preview` | Serve the built bundle locally for smoke tests. |
| frontend | `pnpm lint` | Execute ESLint across the TypeScript codebase. |

## Contributing
Follow the service-level guides in `backend/CONTRIBUTING.md` and `frontend/CONTRIBUTING.md` for branching, coding standards, and review expectations. Pull requests should include relevant tests, documentation updates, and manual verification (API + UI) where applicable.

## License
Both services are distributed under the [Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License](http://creativecommons.org/licenses/by-nc-sa/4.0/). See the LICENSE files in `backend/` and `frontend/` for details.
