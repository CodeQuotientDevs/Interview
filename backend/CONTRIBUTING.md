# Contributing Guide

Thank you for helping improve the AI Interview Node server! This document captures the workflow, architectural patterns, and coding standards that keep the codebase consistent.

## Project Flow at a Glance
1. **Process bootstrap (`src/index.js`)**
   - Loads environment variables via `libs/dynamic-env`, connects to MongoDB, configures the Redis-backed session store, and mounts the versioned API under `/api`.
   - Starts the worker loop (`src/worker`) when the process receives the `--worker true` flag.
2. **Versioned routing (`src/app`)**
   - `src/app/index.js` attaches the `v1` router; additional API versions follow the same pattern.
3. **Module composition (`src/app/v1/<module>`)**
   - Each feature (auth, interviews, candidates, etc.) is built as a mini-module with three layers:
     - `data-access/` — Mongoose models and repositories for persistence.
     - `domain/` — Service classes that encapsulate business logic.
     - `entry-points/` — Express route factories that wire services to HTTP handlers and middleware.
   - `index.js` inside the module wires the layers together and exposes `{ route, services }` objects used by the versioned router.
4. **Cross-cutting libraries (`src/libs` & `src/constants`)**
   - Shared utilities (Redis clients, mailer, logger, args parser, etc.) live here and are imported via module aliases (`@`, `@libs`).

### Versioning Principles
- Breaking API changes must ship via a new version directory (e.g., `src/app/v2`).
- Each version is isolated—do not import files directly across versions. Share logic through libraries (`src/libs`, `src/constants`) or duplicate small adapters to keep versions independent.
- Deprecate older versions deliberately (communicate timelines, update README) before removing them, ensuring clients have time to migrate.

## Request Lifecycle Example
1. A client calls `GET /api/v1/interviews`.
2. Express routes the request to `src/app/v1/interview/entry-points/interview.route.js`, created via `createInterviewRoutes`.
3. The handler validates any input with Zod or middleware, then delegates to the injected `InterviewService` (`src/app/v1/interview/domain/interview.service.js`).
4. The service orchestrates business logic and fetches data by calling methods on the repository (`src/app/v1/interview/data-access/interview.repository.js`).
5. The repository interacts with the Mongoose model (`interview.models.js`) to run database queries.
6. Results bubble back up to the route, which formats the JSON response and logs relevant metadata using the shared logger.
7. Long-running work (for example, regenerating reports) is queued in Redis for the background worker to consume, keeping HTTP responses snappy.

## Creating a New Route or Module
Follow the existing feature structure to keep modules cohesive and testable.

1. **Model / Repository (`data-access/`)**
   - Define or reuse a Mongoose model (`*.models.js`).
   - Wrap persistence logic in a repository class (`*.repository.js`) that exposes CRUD helpers (e.g., `findOne`, `save`, `updateOne`).
2. **Domain service (`domain/`)**
   - Create a service class that receives the repository in its constructor.
   - Encapsulate business rules in descriptive async methods; avoid calling repositories directly from routes.
3. **Entry point (`entry-points/`)**
   - Export a factory function (e.g., `createFooRoutes`) returning an Express router.
   - Inject services via the factory parameters; do not `require` concrete classes inside handlers.
   - Validate request payloads with Zod schemas (see `src/zod`) and gate protected endpoints with the appropriate middleware (e.g., `middleware.authMiddleware.checkIfLogin`).
   - Prefer structured JSON responses and use the shared `logger` for error reporting.
4. **Module index**
   - Compose the repository, service, and route in `src/app/v1/<module>/index.js`, exporting `{ <module>Route, <module>Services }`.
5. **Register the route**
   - Add the new router to `src/app/v1/index.js` under an appropriate path prefix.
6. **Documentation / environment**
   - Document new endpoints and required environment variables in `README.md` (and `.env.example` if new variables are introduced).
7. **Verification**
   - Run `pnpm dev` (or `docker compose up --build`) and exercise the new endpoints.
   - Add or update tests/scripts if applicable before opening a pull request.

## Coding Standards
- **Module system**: Use CommonJS (`require`/`module.exports`). Respect the configured module aliases.
- **Formatting**: Follow the existing 4-space indentation and trailing commas style. Avoid introducing non-ASCII characters without necessity.
- **Validation**: Use Zod schemas for request validation. Return `400` with schema errors and descriptive payloads.
- **Error handling**: Wrap async handlers in `try/catch`, log errors via `logger.error`, and respond with consistent JSON (`{ error: 'message' }`). Avoid `console.log`.
- **Async flow**: Prefer `async/await`; do not mix callbacks and promises within the same block.
- **Environment access**: Centralise lookups through `process.env`. For dynamic updates, rely on `libs/dynamic-env` rather than re-reading files manually.
- **Redis / Mongo usage**: Reuse shared clients (`libs/redis`, `libs/sharedRedis`) instead of creating new connections inside handlers.
- **Background jobs**: If your feature needs long-running tasks, expose them through `src/worker` and guard access with new worker flags instead of starting threads in request handlers.
- **Logging**: Leverage `logger.info`/`logger.error` for structured logs; include contextual metadata (`endpoint`, `payloadId`, etc.).
- **File organisation**: Keep modules self-contained. Co-locate Zod schemas under `src/zod` and constants under `src/constants` for discoverability.

## Git & Pull Request Expectations
1. **Branching**: Create feature branches from `main` (`git checkout -b feature/your-change`).
2. **Commits**: Use clear, imperative messages (e.g., `Add interview evaluation routes`).
3. **PR Checklist**:
   - README or other docs updated if behaviour or configuration changes.
   - New environment variables documented in `.env.example`.
   - Routes verified locally (`pnpm dev`) or via Docker.
   - Tests added or existing behaviour manually verified (note what you ran in the PR description).
4. **Code review**: Be ready to explain design decisions, especially around new schemas, worker behaviour, or data migrations.

## Support
Open an issue or start a discussion if you need architectural guidance. For urgent fixes impacting production flows (auth, candidate chat, worker processing), coordinate with the maintainers before merging.

Happy building!
