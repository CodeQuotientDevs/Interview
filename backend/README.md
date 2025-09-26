# AI Interview Node Server

Service powering **CodeQuotient’s AI-led interview experience**.
The API coordinates interview definitions, candidate onboarding, AI chat sessions, and report pipelines using **Express**, **MongoDB**, **Redis**, and **Google Gemini** models.

---

## Table of Contents

* [Overview](#overview)
* [Key Capabilities](#key-capabilities)
* [Project Layout](#project-layout)
* [Requirements](#requirements)
* [Configuration](#configuration)
* [Running the Services](#running-the-services)
* [Local Development](#local-development)
* [Docker Workflow](#docker-workflow)
* [Background Worker](#background-worker)
* [Troubleshooting](#troubleshooting)
* [Contributing](#contributing)
* [License](#license)

---

## Overview

This service exposes a REST API under `/api/v1` for managing interviews and guiding candidates through AI-driven conversations.

* **Redis** handles sessions, queues, and transcripts.
* **MongoDB** persists domain models.
* **Google Gemini** powers AI-based interviewer conversations and reporting.

---

## Key Capabilities

* Google OAuth login backed by Redis sessions.
* Express + Mongoose + Zod-based REST APIs for interviews, candidates, resumes, and reports.
* AI interviewer using **Gemini models** for real-time conversations and report generation.
* Mailjet-integrated email invites via EJS templates.
* Optional **PM2** bootstrap script for running multiple API + worker processes.

---

## Project Layout

| Path                 | Description                                                                                |
| -------------------- | ------------------------------------------------------------------------------------------ |
| `src/index.js`       | Express bootstrap, Mongo connection, session store, router setup, worker toggling.         |
| `src/app/v1`         | Versioned API modules (auth, interviews, candidates, resumes, etc.).                       |
| `src/libs`           | Shared utilities (`cacheService`, `dynamic-env`, `logger`, Redis clients, CLI arg parser). |
| `src/worker`         | Background tasks for persisting chat and generating reports.                               |
| `docker-compose.yml` | Docker Compose stack for the API, MongoDB, and Redis.                                      |
| `.env.example`       | Template for all environment variables.                                                    |

---

## Requirements

* **Node.js 18+**
* **pnpm** (preferred) or npm/yarn.
* **MongoDB** instance accessible to the server.
* **Redis** for sessions and worker queues.
* **Google AI Studio key** (Gemini).
* *(Optional)* Mailjet or SMTP credentials for sending emails.

---

## Configuration

The server loads environment variables from `.env` (auto-reloaded by `libs/dynamic-env`).
Below are **detailed explanations** for each environment key in the same order as your `.env.example`, followed by a **summary table**.


#### `MONGO_CONNECTION_URI`

Connection URI for **MongoDB**, used by Mongoose to store interviews, candidates, transcripts, and reports.

```bash
MONGO_CONNECTION_URI=mongodb://interview-mongo/ai
```

**Notes:**

* Must be reachable by the server.
* Use authenticated users in production.
* For production deployments, use replica sets or managed Mongo services.

---

#### SHARED REDIS CONFIG

Defines **shared Redis** connection details — typically used for **Express session management** or other shared state.

```bash
SHARED_REDIS_IP=interview-redis
SHARED_REDIS_PORT=6379
SHARED_REDIS_PASSWORD=
```

**Notes:**

* Required for Express sessions.
* Keep password empty for local dev but secure it in production.
* Redis should run on a persistent volume for data durability.

---

#### PRIMARY REDIS CONFIG

Primary **Redis instance** used for application data — queues, transcripts, caching, and background jobs.

```bash
REDIS_IP=interview-redis
REDIS_PORT=6379
REDIS_PASSWORD=
```

**Notes:**

* Required for the worker and queue handling.
* Use a dedicated Redis database for this service in multi-app environments.

---

#### `FRONTEND_URL`

The **frontend application’s base URL** used for CORS validation and redirect URLs (Google login, invitations).

```bash
FRONTEND_URL=http://localhost:5173
```

**Example for production:**

```
FRONTEND_URL=https://app.codequotient.com
```

---

#### `CURRENT_HOST`

The **public base URL** of your API, used to generate **absolute links** (invite links, email URLs, etc.).

```bash
CURRENT_HOST=https://aiinterview.codequotient.com
```

If not set, defaults may fall back to `localhost`, which will break links in production.

---

#### `SESSION_SECRET`

Secret string used to **sign Express session cookies**.
Prevents tampering and session hijacking.

```bash
SESSION_SECRET=your-app-secret
```

**Recommendation:**
Use a strong, random 32+ character secret in production.

---

#### `AI_MODEL_KEY`

Google AI Studio API key used to communicate with **Gemini models** for chat and report generation.

```bash
AI_MODEL_KEY=ya29.xxxxx
```

**Notes:**

* Obtain from [Google AI Studio](https://aistudio.google.com/).
* Required for all AI-driven flows.
* Keep this key secret and rotate regularly.

---

#### `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`

Optional **Google OAuth credentials** to enable login at `/api/v1/auth/login/google`.

```bash
GOOGLE_CLIENT_ID=123.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-secret
```

**Setup:**

* Create in [Google Cloud Console](https://console.cloud.google.com/apis/credentials).
* Match **Authorized origins** and **Redirect URIs** with your `FRONTEND_URL`.
* Keep `GOOGLE_CLIENT_SECRET` secure.

---

#### `EMAIL_SENDER`, `EMAIL_API`, `EMAIL_SECRET`

Email configuration for **Mailjet** or **SMTP**. Used for sending system emails such as invites and notifications.

```bash
EMAIL_SENDER=no-reply@example.com
EMAIL_API=mailjet-public-key
EMAIL_SECRET=mailjet-secret
```

**Notes:**

* `EMAIL_SENDER`: "From" address in outgoing emails.
* `EMAIL_API`: Mailjet public key or SMTP username.
* `EMAIL_SECRET`: Mailjet secret key or SMTP password.
* Optional — required only if email functionality is enabled.
* Rotate credentials periodically.

---

### Summary Table

| Variable                | Required        | Purpose                                      |
| ----------------------- | --------------- | -------------------------------------------- |
| `MONGO_CONNECTION_URI`  | ✅               | MongoDB URI for all persistent data.         |
| `SHARED_REDIS_IP`       | ✅               | Host for shared Redis (session store).       |
| `SHARED_REDIS_PORT`     | ✅               | Port for shared Redis instance.              |
| `SHARED_REDIS_PASSWORD` | ⚙️ Optional     | Password for shared Redis.                   |
| `REDIS_IP`              | ✅               | Host for main Redis (queue + data).          |
| `REDIS_PORT`            | ✅               | Port for main Redis.                         |
| `REDIS_PASSWORD`        | ⚙️ Optional     | Password for main Redis.                     |
| `FRONTEND_URL`          | ✅               | Frontend base URL for redirects and CORS.    |
| `CURRENT_HOST`          | ⚙️ Optional     | Public API URL used in emails and links.     |
| `SESSION_SECRET`        | ✅               | Secret key for signing session cookies.      |
| `AI_MODEL_KEY`          | ✅ (AI features) | Google AI Studio key for Gemini integration. |
| `GOOGLE_CLIENT_ID`      | ⚙️ Optional     | OAuth client ID for Google login.            |
| `GOOGLE_CLIENT_SECRET`  | ⚙️ Optional     | OAuth secret paired with above ID.           |
| `EMAIL_SENDER`          | ⚙️ Optional     | “From” address for system emails.            |
| `EMAIL_API`             | ⚙️ Optional     | Mailjet public key or SMTP username.         |
| `EMAIL_SECRET`          | ⚙️ Optional     | Mailjet secret key or SMTP password.         |

---

### Security Notes

* Never commit `.env` to source control.
* Use CI/CD secret management or vaults for production.
* Rotate sensitive keys periodically (`AI_MODEL_KEY`, `EMAIL_SECRET`, etc.).
* Use separate MongoDB and Redis instances for production workloads.

---

## Running the Services

| Command                                           | Description                                                    |
| ------------------------------------------------- | -------------------------------------------------------------- |
| `pnpm dev`                                        | Development mode with hot reload, port `4004`, worker enabled. |
| `pnpm start`                                      | Runs production mode; worker optional via `--worker true`.     |
| `node src/index.js --port <port> [--worker true]` | Manual process launch.                                         |
| `./runServer.sh`                                  | PM2 bootstrap launching dual API instances + worker.           |

Health check:
`GET /check` → Confirms process is alive.

---

## Local Development

1. Install dependencies:

   ```bash
   pnpm install
   ```
2. Copy `.env.example` to `.env`:

   ```bash
   cp .env.example .env
   ```
3. Start local MongoDB and Redis instances.
4. Run:

   ```bash
   pnpm dev
   ```

   The app runs on port `4004` by default.

---

## Docker Workflow

1. Copy `.env.example` → `.env` and fill in secrets.
2. Start containers:

   ```bash
   docker compose up -d
   ```
3. Stop stack:

   ```bash
   docker compose down
   ```
4. To verify config:

   ```bash
   docker compose config
   ```

The stack runs:

* API (`4004 → 80`)
* MongoDB
* Redis
  with persistent volumes.

---

## Background Worker

When run with `--worker true`, `src/worker/index.js` executes two recurring jobs:

* `saveTopResultFromRedis`: Saves chat history from Redis to MongoDB.
* `saveSubmissionFromQueue`: Reprocesses submissions, regenerates reports, and handles email notifications.

---

## Troubleshooting

| Issue                   | Check                                      |
| ----------------------- | ------------------------------------------ |
| **Session errors**      | Verify Redis and `SESSION_SECRET`.         |
| **Google login issues** | Ensure OAuth redirect URIs match.          |
| **AI model errors**     | Verify `AI_MODEL_KEY` and model access.    |
| **Email not sending**   | Confirm Mailjet/SMTP credentials and logs. |

---

## Contributing

Contributions are welcome.
Follow `CONTRIBUTING.md` and ensure:

* Code matches existing lint/style rules.
* Tests updated where needed.
* Both API and worker start cleanly (`pnpm dev`).

---

## License

[![CC BY-NC-SA 4.0](https://licensebuttons.net/l/by-nc-sa/4.0/88x31.png)](http://creativecommons.org/licenses/by-nc-sa/4.0/)

Licensed under [Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International](http://creativecommons.org/licenses/by-nc-sa/4.0/).

---

Would you like me to append a **small “.env variable validation checklist”** (for ops/devs to verify before deployment)? It helps teams confirm all mandatory keys are present before container startup.
