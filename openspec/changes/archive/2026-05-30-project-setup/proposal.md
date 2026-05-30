## Why

Decision Mirror is greenfield: there is no application skeleton, no datastore, no
quality gate, and no shared domain vocabulary for the feature work to build on. Every
later change (auth, capture, the agent, history, dashboard) assumes a strict-TypeScript
Next.js app, a Postgres schema with append-only analysis versions and a pgvector memory
table, an enforced lint/typecheck/test gate, and a single source of truth for the
controlled taxonomies. This change lays exactly that foundation so the first behavioural
feature can be written test-first on day one.

## What Changes

- Scaffold a single Next.js (App Router) + TypeScript (strict) application with Tailwind,
  pnpm, and the `@/` path alias, following the project structure in `architecture/01`.
- Establish the developer-experience quality gate: ESLint (flat config) + Prettier with
  non-overlapping responsibilities, `tsc --noEmit`, and Husky + lint-staged pre-commit
  running format/lint/typecheck on staged files.
- Initialize **shadcn/ui** (Radix + Tailwind) and define the CSS-variable design-token
  layer for light/dark themes.
- Add Prisma and define the relational schema — `User`, `Account`, `Session`, `Decision`,
  and append-only `Analysis` (version) models — with relations and the analysis-status
  enum (`processing | ready | failed`).
- Enable the **pgvector** extension and create the long-term-memory table via SQL
  migration; provide a local `docker compose` Postgres and wire `DATABASE_URL` plus the
  initial migration.
- Add environment configuration: a committed `.env.example` documenting every required
  key (`DATABASE_URL`, `AUTH_SECRET`, `AUTH_GOOGLE_ID/SECRET`, `ANTHROPIC_API_KEY` +
  model, embeddings key, `NEXT_PUBLIC_SENTRY_DSN`, `POSTHOG_KEY`, `LANGSMITH_API_KEY`), loaded from a
  git-ignored `.env.local`.
- Define shared TypeScript types and the `category` enum + 8-entry cognitive-bias catalog
  as a single Zod-backed source of truth, exposing language-neutral identifiers (labels
  are localized later by `internationalization`).

No user-facing feature behaviour ships here; this is the platform the features stand on.

## Capabilities

### New Capabilities
- `project-foundation`: the application scaffold, dev-ex tooling, and the enforced
  lint/typecheck/test quality gate, plus environment-variable configuration and the
  documented project structure/naming conventions.
- `data-model`: the persistent schema — relational models (`User`, `Account`, `Session`,
  `Decision`, append-only `Analysis` versions), the analysis-status enum, per-user
  foreign-key scoping, and the pgvector long-term-memory table on the same instance.
- `domain-taxonomy`: the controlled taxonomies (the fixed `category` enum and the fixed
  catalog of 8 cognitive biases) as a single Zod-backed source of truth over
  language-neutral identifiers.

### Modified Capabilities
<!-- None — greenfield project; the baseline at openspec/specs/ is empty. -->

## Impact

- New repository skeleton: `app/`, `components/`, `lib/`, `agent/`, `prisma/`, `tests/`,
  `e2e/`, `messages/`, plus config files (`eslint.config.mjs`, `prettier`, `tsconfig`,
  `components.json`, `docker-compose.yml`, `.env.example`).
- New dependencies: Next.js, React, TypeScript, Tailwind, shadcn/ui (Radix), Prisma,
  Zod, ESLint, Prettier, Husky, lint-staged. (Feature-specific deps — Auth.js, LangGraph,
  next-intl, observability SDKs — are added by their own changes.)
- New persistent datastore: a local Postgres (docker compose) with the pgvector extension
  enabled and the initial Prisma + raw-SQL migrations applied.
- New developer workflow: `pnpm install`, `docker compose up -d`, `pnpm db:migrate`,
  `pnpm dev`, and the `pnpm lint && pnpm typecheck && pnpm test` gate (also the CI gate).
- Establishes contracts every downstream change consumes: the data model, the status
  enum, and the controlled taxonomies. Technical detail lives in `ARCHITECTURE.md` and
  `architecture/01`–`02`; the broader product change is
  `openspec/changes/build-decision-mirror/`.
