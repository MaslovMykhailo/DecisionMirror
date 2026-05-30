## Context

Decision Mirror is greenfield — the repo currently holds only documentation
(`ARCHITECTURE.md`, `architecture/*`), the OpenSpec product change, and an MCP/tooling
config. There is no app, no database, and no quality gate. This change builds the
foundation that every feature change consumes, so its decisions are effectively binding on
the rest of the project.

The binding constraints come from `AGENTS.md` and `architecture/01`–`02`:

- TDD is mandatory; the gate (`pnpm lint && pnpm typecheck && pnpm test`) must exist and be
  green from the first commit, and tests must run offline/deterministically.
- One language, one deployment, one datastore: TypeScript, a single Next.js app on Vercel,
  and one PostgreSQL instance serving relational data, pgvector memory, and the LangGraph
  checkpointer.
- Per-user isolation and "no decision content in Sentry/PostHog" are hard rules the data
  model and types must make easy to honor.

This change corresponds to Section 1 ("Project setup and foundation") of the
`build-decision-mirror` tasks. It deliberately stops at the platform layer: no auth, no
agent, no UI features.

## Goals / Non-Goals

**Goals:**

- A scaffolded strict-TypeScript Next.js (App Router) app with pnpm, Tailwind, and the
  `@/` alias, matching the `architecture/01` layout.
- An enforced, offline quality gate: ESLint (flat) + Prettier (non-overlapping), `tsc
  --noEmit`, Husky + lint-staged pre-commit.
- shadcn/ui initialized with a light/dark CSS-variable token layer.
- A Prisma relational schema (`User`, `Account`, `Session`, `Decision`, append-only
  `Analysis`) with the status enum and per-user FKs, plus a pgvector memory table created
  by SQL migration, runnable locally via docker compose.
- A committed `.env.example` documenting all required keys.
- The controlled taxonomies (category enum + 8-bias catalog) as a single Zod-backed module.

**Non-Goals:**

- Auth.js wiring, the LangGraph agent, next-intl, observability SDKs, and any feature UI —
  each lands in its own change. (Their dependencies are intentionally *not* installed here.)
- CI workflow and Vercel deployment (Section 14) — out of scope; only the locally runnable
  gate is established now.
- Seeding data or building the Vitest/Playwright harness beyond what proves the gate runs;
  the full testing harness is Section 12.

## Decisions

**Scaffold with `create-next-app` (App Router, TS, Tailwind, pnpm), then conform.**
We generate with the official scaffolder and then adjust to repo conventions (flat ESLint
config, `@/` → repo root, directory layout) rather than hand-rolling. Alternative — a
fully manual setup — was rejected as slower and more error-prone for no benefit, since the
scaffolder already wires Turbopack dev, Tailwind, and `tsconfig` paths.

**ESLint flat config + Prettier with a hard split of duties.** ESLint owns
correctness/quality (`next/core-web-vitals`, `@typescript-eslint`, import-order, a11y);
Prettier owns whitespace/style via `eslint-config-prettier` so the two never fight, with
`prettier-plugin-tailwindcss` sorting classes. Alternative — ESLint stylistic rules — was
rejected because dual ownership of formatting causes churn and conflicting fixes.

**Husky + lint-staged on pre-commit, never bypassed.** Pre-commit runs format + lint +
typecheck on staged files for fast feedback; the full gate runs on demand and (later) in
CI. This encodes the working agreement in tooling rather than memory.

**Prisma owns the relational schema; raw SQL owns pgvector.** Prisma models cover `User`,
`Account`, `Session`, `Decision`, `Analysis`, the `AnalysisStatus` enum, and relations.
The pgvector extension and the long-term-memory table (vector column + `userId`) are
created by a raw SQL migration alongside Prisma's, because pgvector types aren't in
Prisma's typed layer and are accessed through raw queries / a thin helper. Alternative —
a separate vector DB — was rejected by the "one datastore" principle.

**`Analysis` is append-only and versioned; "current" is derived.** Re-analysis inserts a
new row with an incremented per-decision `version` rather than mutating; the current
analysis is the newest `ready` row. This keeps full history for free and makes
retry/re-analysis a pure insert. Alternative — mutate-in-place with a separate history
table — was rejected as more moving parts for the same guarantee.

**Per-user scoping baked into the schema.** `Decision.userId` is a required FK with cascade
delete; `Analysis` is reachable only via its `Decision`. This makes "scope every query by
`userId`" the path of least resistance for downstream code. (Enforcement in queries is each
feature's job; the schema makes it natural.)

**Taxonomies as language-neutral Zod enums in one module.** `category` and the 8-bias
catalog are defined once as stable identifiers, with display labels deferred to
`internationalization`. Downstream schemas (notably `agent/schema.ts`) compose them by
import, so a taxonomy change propagates to every consumer and aggregation stays
deterministic. Alternative — strings validated ad hoc per call site — was rejected as
duplication that drifts.

**Local Postgres via docker compose using a pgvector image.** Same engine + extension as
production so relational and vector behavior is real locally and (later) in CI.
`DATABASE_URL` is the single connection knob.

## Risks / Trade-offs

- **Foundation decisions are hard to reverse** (schema shape, taxonomy identifiers, alias
  layout) → keep this change minimal and contract-focused; defer anything a feature can own
  to that feature, and capture any change back into `ARCHITECTURE.md`/specs.
- **Installing feature deps early would bloat and pre-commit the architecture** → strictly
  exclude Auth.js/LangGraph/next-intl/observability here; each arrives with its own change
  and tests.
- **pgvector outside Prisma's typed layer** → a raw-SQL migration plus a thin typed helper
  isolates the untyped surface; the relational layer stays fully typed.
- **An empty test suite can't gate behaviour** → the gate is wired now (commands exist and
  pass), but real coverage starts with the first feature, written test-first per AGENTS.md.
- **Taxonomy churn breaks stored data** → identifiers are language-neutral and stable;
  label changes are i18n-only and never touch stored values or aggregation keys.

## Migration Plan

1. Scaffold the Next.js app and conform tooling (alias, ESLint/Prettier, Husky/lint-staged);
   verify `pnpm lint && pnpm typecheck && pnpm test` is green on the clean tree.
2. Initialize shadcn/ui and the light/dark token layer.
3. Add Prisma; define models + `AnalysisStatus` enum; add the raw-SQL migration enabling
   pgvector and creating the memory table.
4. Add `docker-compose.yml` (pgvector image) and `.env.example`; wire `DATABASE_URL` and the
   `db:migrate` script; apply migrations against a fresh local database.
5. Add the Zod-backed taxonomy module (category enum + 8-bias catalog) and shared types.

Rollback: this is additive and greenfield — revert the change's commits. The only stateful
artifact is the local dev database, which is disposable (`docker compose down -v` and
re-migrate). No production data exists yet.

## Decisions made during build

- **ESLint pinned to v9, not v10.** ESLint 10 removed `context.getFilename()`, which
  `eslint-plugin-react@7.37.5` (bundled by `eslint-config-next@16`) still calls — linting
  crashes under ESLint 10. `eslint-config-next@16` peer-supports `eslint >=9`, so we pin
  `^9.39.4`. Revisit when the Next plugin chain is ESLint-10-compatible. (`architecture/01`
  says only "ESLint flat config" — no version — so this is consistent, not a deviation.)
- **Vitest uses native `resolve.tsconfigPaths`** instead of the `vite-tsconfig-paths`
  plugin (Vitest 4 resolves the `@/` alias natively) — one fewer dependency.
- **Gate strengthened with `noUnusedLocals` + `noUnusedParameters`.** Beyond the
  `architecture/01` baseline (`strict`, `noUncheckedIndexedAccess`); makes dead code a
  blocking typecheck error (and is what the pre-commit-block verification exercised).
- **Memory vector dimension fixed at 1024** in the pgvector migration to match the default
  embeddings model (Voyage `voyage-3`). If the embeddings provider changes, the
  agent-memory change must adjust the column.

## Open Questions

- **Hosted Postgres provider** (Neon vs Vercel Postgres) — not needed for this change
  (local + CI suffice); decided when deployment (Section 14) lands.
- **commitlint / Conventional Commits enforcement** — recommended in `architecture/01`;
  deferred to the CI change rather than enforced via a hook now.
- **Live migration verification** — `docker compose up` + `pnpm db:migrate` against a fresh
  database was not runnable in the authoring environment (no Docker). The relational
  migration SQL was generated offline via `prisma migrate diff` and the pgvector migration
  is hand-authored; both still need a one-time apply against a real Postgres to confirm.
