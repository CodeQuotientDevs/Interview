# Contributing Guidelines

Thank you for investing time in improving the AI Interview Frontend. This document captures the standards we follow so changes land smoothly and stay maintainable.

## Getting Started
- **Node & pnpm:** Install Node.js 18.18+ and pnpm 9+. pnpm is the canonical package manager for this repo.
- **Install dependencies:** Run `pnpm install` once after cloning and whenever lockfile changes.
- **Environment file:** Copy `.env.example` to `.env` and populate the values needed for your feature area before running the app or tests.

## Development Workflow
1. **Create a focused branch** from `main` (e.g., `feature/interview-room-tweaks`). Keep changes scoped; split work if it grows large.
2. **Align with existing patterns.** Prefer existing components, hooks, and stores. If you must introduce new abstractions, document their intent inline.
3. **Sync upstream regularly** with `git pull --rebase origin main` to reduce merge conflicts.
4. **Run the app locally** with `pnpm dev` or the provided Docker Compose stack before raising a pull request.

## Coding Standards
- **TypeScript first:** Avoid `any` unless you have a documented reason. Leverage existing Zod schemas and types.
- **UI consistency:** Reuse shadcn/ui primitives and shared styles. Follow Tailwind conventions already present in adjacent files.
- **State management:** Prefer extending Zustand stores and TanStack Query hooks rather than introducing new global state patterns.
- **Logging:** Use helpers from `src/lib/logger` to keep structured logs consistent.
- **Accessibility:** Ensure interactive elements are keyboard accessible and labelled appropriately.

## Testing & Quality Gates
Before opening a pull request, run the following commands from the repository root:
- `pnpm lint` – required to pass CI linting.
- `pnpm build` – ensures the project type-checks and compiles.

Add tests when behaviour changes or regressions are possible. Document why a test is impractical if you decide to skip it.

## Commit & Pull Request Guidelines
- **Commit messages:** Use Conventional Commits (e.g., `feat: add candidate bulk upload summary`) so changelog generation stays reliable.
- **Small commits:** Prefer incremental commits that tell the story of the change.
- **PR description:** Summarise the intent, list notable implementation details, and call out any follow-up tasks or known gaps.
- **Screenshots / recordings:** Include them whenever UI is touched.
- **Review readiness:** Confirm lint/build commands pass and the feature works locally. Mark work-in-progress PRs with a clear prefix (`WIP:`) or use draft mode.

## Documentation
- Update the README or relevant docs when you add new scripts, env vars, or workflows.
- Keep inline comments short and purposeful—focus on rationale over restating the code.

## Reporting Issues
When filing an issue, include:
- A clear title and summary.
- Steps to reproduce (if applicable).
- Expected vs. actual behaviour.
- Logs, screenshots, or error messages that help triage.

## Code of Conduct
Be respectful, collaborative, and focus on constructive feedback during code reviews. We assume positive intent and share responsibility for maintaining a welcoming environment.
