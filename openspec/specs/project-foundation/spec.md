# project-foundation Specification

## Purpose

Defines the application skeleton and developer-experience baseline for Decision Mirror: a
single strict-TypeScript Next.js app, an enforced offline quality gate, documented
environment configuration, and a shadcn/ui theming token layer.

## Requirements

### Requirement: Single Next.js TypeScript application skeleton

The system SHALL be a single Next.js (App Router) application written in TypeScript with
strict type-checking, using pnpm as the package manager and the `@/` path alias resolving
to the repository root. The repository SHALL follow the directory layout defined in
`architecture/01` (`app/`, `components/`, `lib/`, `agent/`, `prisma/`, `tests/`, `e2e/`,
`messages/`).

#### Scenario: Strict TypeScript is enforced

- **WHEN** `tsc --noEmit` runs against the repository
- **THEN** it compiles with `strict: true` and `noUncheckedIndexedAccess: true` enabled
- **AND** any type error causes a non-zero exit

#### Scenario: Path alias resolves to repo root

- **WHEN** a module imports another module via `@/lib/...`
- **THEN** the import resolves from the repository root in both the build and the test runner

#### Scenario: pnpm is the package manager

- **WHEN** a contributor installs dependencies
- **THEN** `pnpm install` succeeds against the committed `pnpm-lock.yaml`

### Requirement: Enforced quality gate

The system SHALL provide a deterministic, offline quality gate consisting of linting,
formatting checks, type-checking, and tests. ESLint (flat config) and Prettier SHALL have
non-overlapping responsibilities so they never conflict. A Husky pre-commit hook SHALL run
format, lint, and type-check over staged files via lint-staged. The same `pnpm lint`,
`pnpm typecheck`, and `pnpm test` commands SHALL be runnable locally and in CI.

#### Scenario: Gate passes on a clean tree

- **WHEN** `pnpm lint && pnpm typecheck && pnpm test` runs on a freshly scaffolded, unmodified tree
- **THEN** every command exits zero

#### Scenario: Lint fails on a violation

- **WHEN** a staged file violates an ESLint rule
- **THEN** `pnpm lint` exits non-zero and the pre-commit hook blocks the commit

#### Scenario: Lint and format do not conflict

- **WHEN** a file is formatted by Prettier and then linted by ESLint
- **THEN** ESLint reports no formatting-related errors (formatting is owned by Prettier via `eslint-config-prettier`)

### Requirement: Documented environment configuration

The system SHALL document every required environment variable in a committed
`.env.example` and load runtime values from a git-ignored `.env.local`. `.env.example`
SHALL contain no secret values. The documented keys SHALL include `DATABASE_URL`,
`AUTH_SECRET`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`, `OPENAI_API_KEY` and its model
identifier, the embeddings provider key, `NEXT_PUBLIC_SENTRY_DSN`, `POSTHOG_KEY`, and
`LANGSMITH_API_KEY`.

#### Scenario: Example file lists all required keys without values

- **WHEN** a contributor opens `.env.example`
- **THEN** every required key is present with an empty or placeholder value and no real secret

#### Scenario: Local secrets are not committed

- **WHEN** a contributor creates `.env.local`
- **THEN** the file is ignored by git and never tracked

### Requirement: Theming token layer

The system SHALL initialize shadcn/ui (Radix + Tailwind) and define a CSS-variable
design-token layer that supports both light and dark themes, so feature components can
consume tokens rather than hard-coded colors.

#### Scenario: Light and dark tokens are defined

- **WHEN** the application renders under the light theme and under the dark theme
- **THEN** the shared design tokens resolve to theme-appropriate values from CSS variables

### Requirement: Browser-decodable app icon

The system SHALL expose a browser-decodable application icon on the deployed domain. The bytes
served for an icon URL MUST match the declared content type and the Next.js icon convention used by
the app.

#### Scenario: Root favicon is decodable

- **WHEN** a browser requests `/favicon.ico`
- **THEN** the response body is a valid ICO file if the response is declared as `image/x-icon` or
  `image/vnd.microsoft.icon`
- **AND** the browser can decode the icon without an icon decode error

#### Scenario: Generated icon metadata matches content

- **WHEN** the app uses a generated or SVG icon convention instead of a root ICO file
- **THEN** the emitted icon link points at that icon URL
- **AND** the response content type matches the icon bytes served from that URL

### Requirement: No obsolete project gitkeep placeholders

The repository SHALL NOT track `.gitkeep` placeholder files in project-owned source, test,
application, or OpenSpec directories once those directories contain real files or no longer need to
be versioned as empty directories.

#### Scenario: Project gitkeep files are absent

- **WHEN** the repository is scanned outside dependency and generated-output directories
- **THEN** no tracked `.gitkeep` files exist under project-owned directories such as `app/`,
  `components/`, `lib/`, `agent/`, `messages/`, `tests/`, or `e2e/`
