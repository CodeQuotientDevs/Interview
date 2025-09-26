# AI Interview Frontend

[![CC BY-NC-SA 4.0][cc-by-nc-sa-shield]][cc-by-nc-sa]

Candidate Quotient's web client for running AI-assisted technical interviews. The app lets hiring teams design interview templates, manage candidate cohorts, and guide candidates through conversational AI assessments with live code execution support.

## Table of Contents
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Configuration (ENV)](#configuration-env)
- [Setup](#setup)
- [Docker Compose](#docker-compose)
- [Environment Variables](#environment-variables)
- [Available Scripts](#available-scripts)
- [Project Structure](#project-structure)
- [Key Workflows](#key-workflows)
- [Development Notes](#development-notes)
- [Contributing](#contributing)
- [License](#license)

## Features
- **Authentication:** Email/password login with Zod-backed validation, Google OAuth, session persistence, and protected routes.
- **Interview management:** Create, edit, clone, and filter interview templates with keyword tagging, skill weighting, and AI instruction prompts.
- **Candidate operations:** Invite candidates individually or via Excel uploads, re-evaluate attempts, conclude interviews, and inspect reports.
- **AI interview room:** Conversational UI powered by AI responses, Monaco editor integration for coding tasks, and language-aware prompts.
- **UX foundation:** Centralised loaders, toast notifications, alert dialogs, and responsive layouts built with Tailwind CSS and shadcn/ui primitives.

## Tech Stack
- React 18 + TypeScript using Vite 6 for development and bundling.
- React Router v7 data APIs for routing.
- Zustand state management paired with TanStack Query for async data.
- Zod schemas for request/response validation and form safety.
- Tailwind CSS, shadcn/ui, Radix UI, and lucide-react for design system components.
- Monaco editor for in-browser code execution prompts.
- Axios clients with Pino-backed logging helpers.

## Prerequisites
- Node.js 18.18+ (Vite 6 requires an up-to-date Node runtime).
- pnpm 9+ (preferred). npm or yarn will work but lockfile parity is not guaranteed.

## Configuration (ENV)
Before starting the frontend, copy the environment template and provide the values required by the client:

```bash
cp .env.example .env
```

Edit `.env` and set the following Vite-prefixed variables. These are read by the frontend at build/dev time and are the only environment variables this repository requires.

### VITE_MAIN_SERVER_URL
Base URL used by the frontend to call interview and candidate APIs (the backend service that serves interview/candidate endpoints).

```bash
VITE_MAIN_SERVER_URL=https://api.example.com
```

Notes: include the protocol (http/https) and avoid trailing slashes. This value is used by the Axios clients in `src/client/`.

### VITE_AUTH_URL
Base URL for authentication endpoints (session checks, login, logout, token refresh).

Example:
`VITE_AUTH_URL=https://auth.example.com`

Notes: if auth and main APIs share the same domain, this can match `VITE_MAIN_SERVER_URL`.

### VITE_GOOGLE_CLIENT_ID
Google OAuth web client ID used by the login flow for Google Sign-In.

Example:
`VITE_GOOGLE_CLIENT_ID=123.apps.googleusercontent.com`

Notes: configure the Google OAuth client to allow the frontend origin (see `FRONTEND_URL` in the backend) and adjust allowed redirect URIs to match your deployment.

Summary table
A short table summarising the frontend variables:

| Variable | Required | Purpose (short) | Example |
| --- | ---: | --- | --- |
| `VITE_MAIN_SERVER_URL` | Yes | API base URL for interviews/candidates. | `https://api.example.com` |
| `VITE_AUTH_URL` | Yes | Authentication API base URL. | `https://auth.example.com` |
| `VITE_GOOGLE_CLIENT_ID` | No | Google OAuth client ID for login. | `123.apps.googleusercontent.com` |

Note on backend variables
This is the frontend README — only the `VITE_*` variables required by the client are documented here. The backend has its own set of environment variables (database, Redis, AI keys, etc.) documented in the backend repository's `.env.example` or `BACKEND_ENV.md` and in the committed `.docker.env` file. Do not add backend-only keys to this frontend `.env` unless you are running the backend and want all services configured in one place.

## Setup
1. **Install dependencies**
   ```bash
   pnpm install
   ```
   > Use `npm install` or `yarn install` only if pnpm is unavailable; regenerate the lockfile afterwards to avoid divergence.
2. **Copy environment template**
   ```bash
   cp .env.example .env
   ```
3. **Fill in the variables** listed below before starting the app.

## Docker Compose
- Ensure Docker Desktop or the Docker Engine with Compose plugin is installed.
- Reuse the same `.env` file described above; it will be mounted automatically.
- Build and start the stack locally:
  ```bash
  docker compose up --build
  ```
  The frontend becomes available at `http://localhost:8000`.
- Run `docker compose down` (add `-v` to clear volumes) when you want to stop the containers.


## Environment Variables
| Variable | Description |
| --- | --- |
| `VITE_MAIN_SERVER_URL` | Base URL for interview/candidate APIs. |
| `VITE_AUTH_URL` | Base URL for authentication endpoints. |
| `VITE_GOOGLE_CLIENT_ID` | Google OAuth web client ID used by the login flow. |

## Available Scripts
Run all scripts from the repository root.

| Command | Purpose |
| --- | --- |
| `pnpm dev` | Launches the Vite dev server at `http://localhost:5173` with HMR. |
| `pnpm build` | Type-checks and builds the production bundle into `dist/`. |
| `pnpm preview` | Serves the production bundle locally for smoke testing. |
| `pnpm lint` | Runs ESLint with the configured TypeScript rules. |

## Project Structure
```
src/
├── components/        # Reusable UI (AI chat, forms, navigation, loaders, etc.)
├── screen/            # Route-level screens: interview list, candidate view, creation, login
├── store/             # Zustand stores and API client configuration
├── client/            # Axios clients for login and interview services
├── constants/         # Shared enums and static data
├── hooks/             # Custom React hooks
├── lib/               # Utilities (logging, Excel reader, message parsing)
├── zod/               # Zod schemas for runtime validation
├── router.tsx         # React Router configuration
└── main.tsx           # Entrypoint wiring providers and router
```

## Key Workflows
- **Authentication & session:** `src/components/login-form/` and `src/store/app-store/` orchestrate login flows, Google OAuth, session fetching, and toast messaging.
- **Interview lifecycle:** `src/screen/interview-list/` lists and clones interviews, while `src/screen/interview-creation/` handles creation/editing with topic weighting validation.
- **Candidate management:** `src/screen/interview-candidate-list/` supports invites, bulk Excel ingestion via `lib/xlsx-reader`, re-evaluations, and submission completion.
- **AI conversation:** `src/components/ai-chat/` renders transcripts, coordinates the Monaco editor in `src/components/editor/`, and exchanges messages through the main store/API client.

## Development Notes
- The frontend expects backend services under the configured `VITE_MAIN_SERVER_URL` and `VITE_AUTH_URL` domains.
- Google OAuth requires a web client configured for the deployment origin and supplied via `VITE_GOOGLE_CLIENT_ID`.
- shadcn/ui components are tracked in `components.json`; run the shadcn CLI to scaffold additional primitives when needed.
- Bulk uploads rely on `exceljs`; ensure spreadsheets match the schema defined in `src/zod/candidate`.
- Logging utilities in `src/lib/logger` centralise client-side diagnostics; adjust log levels before production builds if necessary.

## Contributing
Read [CONTRIBUTING.md](CONTRIBUTING.md) for detailed workflow, coding standards, and review expectations. If you'd like to contribute, open an issue or submit a pull request once your changes meet those checks.

<br>

[![CC BY-NC-SA 4.0][cc-by-nc-sa-shield]][cc-by-nc-sa]

This work is licensed under a
[Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License][cc-by-nc-sa].

[![CC BY-NC-SA 4.0][cc-by-nc-sa-image]][cc-by-nc-sa]

[cc-by-nc-sa]: http://creativecommons.org/licenses/by-nc-sa/4.0/
[cc-by-nc-sa-image]: https://licensebuttons.net/l/by-nc-sa/4.0/88x31.png
[cc-by-nc-sa-shield]: https://img.shields.io/badge/License-CC%20BY--NC--SA%204.0-lightgrey.svg
