## ADDED Requirements

### Requirement: GitHub Actions deterministic gate

The system SHALL define GitHub Actions workflows that run the deterministic repository gate for
pull requests and pushes to `main`. The gate SHALL include format checking, linting, typechecking,
unit/component tests, database-backed integration tests, production build, and deterministic
Playwright e2e tests.

#### Scenario: Pull request gate runs

- **WHEN** a pull request targets `main`
- **THEN** GitHub Actions runs the configured quality gate jobs
- **AND** a failing job prevents the pull request from being considered merge-ready

#### Scenario: Main branch gate runs

- **WHEN** a commit is pushed to `main`
- **THEN** GitHub Actions runs the same deterministic gate before the commit is treated as a
  healthy release candidate

### Requirement: CI uses real Postgres with pgvector for database tests

The CI integration and e2e jobs SHALL use a PostgreSQL service that supports pgvector, apply Prisma
migrations with `prisma migrate deploy`, and initialize the LangGraph checkpointer before running
database-backed tests.

#### Scenario: Integration tests have migrated schema

- **WHEN** `pnpm test:integration` runs in CI
- **THEN** `DATABASE_URL` points at a migrated PostgreSQL database with pgvector available
- **AND** the LangGraph checkpointer tables are initialized

### Requirement: CI never calls real AI providers

The CI gate MUST NOT make real LLM or embeddings provider calls. Unit, component, integration, and
e2e jobs SHALL mock or stub provider boundaries and SHALL use only test-safe environment defaults.

#### Scenario: Missing provider secrets do not fail deterministic tests

- **WHEN** CI runs without real `OPENAI_API_KEY`, Voyage, or embeddings provider secrets
- **THEN** all deterministic test jobs can still execute using mocks or stubs
- **AND** no network request is made to a real AI provider

### Requirement: Vercel remains the deployment owner

The CI workflow SHALL NOT perform production deployment. Production deployment remains owned by the
existing Vercel Git integration that deploys from `main`.

#### Scenario: CI does not deploy

- **WHEN** GitHub Actions completes successfully on `main`
- **THEN** no GitHub Actions job invokes a Vercel deploy command
- **AND** Vercel's connected Git integration remains responsible for the production deployment
