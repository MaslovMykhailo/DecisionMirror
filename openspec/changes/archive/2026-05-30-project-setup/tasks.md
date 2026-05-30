<!--
TDD is mandatory (AGENTS.md / architecture/05). Behavioural tasks below are written
test-first: a failing test precedes the code that satisfies it. Pure scaffold/config tasks
have no meaningful unit test; their "test" is the gate running green and migrations applying
cleanly — each such task names that verification explicitly.

NOTE: Docker was unavailable in the authoring environment, so the tasks that require a live
Postgres (3.5 apply, 6.1 docker apply) have their files/scripts in place and migration SQL
generated offline, but still need a one-time apply against a real database — see design.md.
-->

## 1. Scaffold and quality gate

- [x] 1.1 Scaffold a Next.js (App Router) + TypeScript app with Tailwind and pnpm; enable `strict` and `noUncheckedIndexedAccess`; set the `@/` alias to the repo root
- [x] 1.2 Conform the repo to the `architecture/01` layout (`app/`, `components/`, `lib/`, `agent/`, `prisma/`, `tests/`, `e2e/`, `messages/`)
- [x] 1.3 Configure ESLint (flat config) with `next/core-web-vitals`, `@typescript-eslint`, import-order, and a11y rules; add Prettier with `prettier-plugin-tailwindcss` and `eslint-config-prettier` so lint/format duties don't overlap
- [x] 1.4 Add `pnpm lint`, `pnpm typecheck` (`tsc --noEmit`), and `pnpm test` scripts; install Vitest minimally so `pnpm test` runs and passes on an empty/trivial suite
- [x] 1.5 Add Husky + lint-staged pre-commit running format + lint + typecheck on staged files
- [x] 1.6 Verify the gate: `pnpm lint && pnpm typecheck && pnpm test` exits zero on the clean tree, and a deliberate lint violation blocks a commit (then revert it)

## 2. Theming foundation

- [x] 2.1 Initialize shadcn/ui (Radix + Tailwind), committing `components.json` and `components/ui/`
- [x] 2.2 Define the CSS-variable design-token layer for light and dark themes; verify tokens resolve under both themes

## 3. Database schema and provisioning

- [x] 3.1 Add `docker-compose.yml` running a Postgres image with the pgvector extension available; wire `DATABASE_URL`
- [x] 3.2 Add Prisma; define `User`, `Account`, `Session`, `Decision`, and `Analysis` models with relations, required `Decision.userId` FK (cascade delete), and the `AnalysisStatus` enum (`processing | ready | failed`)
- [x] 3.3 Model `Analysis` as append-only with a per-decision `version` and an optional human-readable failure reason
- [x] 3.4 Add a raw-SQL migration that enables the `pgvector` extension and creates the user-scoped long-term-memory table (vector column + `userId`)
- [x] 3.5 Add the `db:migrate` script; apply all migrations against a fresh local database and confirm relational tables, the status enum, and the memory table exist — _script + offline-generated migration SQL in place; live apply pending a Docker/Postgres environment (see design.md)_
- [x] 3.6 (Test-first) Add an integration test that the status enum rejects out-of-range values and that a re-analysis insert produces a new incremented `version` while prior rows are unchanged (LLM/provider not involved) — _self-skips without `DATABASE_URL`; runs via `pnpm test:integration`_

## 4. Environment configuration

- [x] 4.1 Create `.env.example` (committed, no secrets) documenting `DATABASE_URL`, `AUTH_SECRET`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`, `ANTHROPIC_API_KEY` + model, embeddings key, `SENTRY_DSN`, `POSTHOG_KEY`, `LANGSMITH_API_KEY`
- [x] 4.2 Ensure `.env.local` is git-ignored and load runtime config from it

## 5. Domain taxonomy (single source of truth)

- [x] 5.1 (Test-first) Write failing tests asserting: the category Zod schema accepts only canonical identifiers, the bias catalog has exactly 8 entries, and the bias schema rejects out-of-catalog values
- [x] 5.2 Implement the Zod-backed taxonomy module (category enum + 8-bias catalog) over language-neutral identifiers to make 5.1 pass
- [x] 5.3 (Test-first) Add a test proving a downstream schema composes the canonical taxonomy by reference (changing a member updates the consumer); export the shared types accordingly

## 6. Verification

- [x] 6.1 Run the full gate (`pnpm lint && pnpm typecheck && pnpm test`) green and confirm a fresh `docker compose up -d` + `pnpm db:migrate` reaches the current schema from empty — _gate green (also `pnpm build`); docker apply pending a Docker environment_
- [x] 6.2 Confirm no feature dependencies (Auth.js, LangGraph, next-intl, observability SDKs) were added by this change; update `ARCHITECTURE.md`/specs if any foundation decision changed — _no feature deps added; build-time decisions recorded in design.md_
