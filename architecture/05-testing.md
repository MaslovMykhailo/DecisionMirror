# 05 — Testing

TDD is mandatory (see [01 — Dev Experience](./01-dev-experience.md#the-tdd-workflow-mandatory)
and `AGENTS.md` / `CLAUDE.md`). The central design idea: **keep non-determinism out of the
red-green loop.** Deterministic tests gate every commit; LLM *quality* is measured separately
by evals.

```
                  ▲  fewer, slower, higher-level
                  │
            ┌─────────────┐
            │     E2E     │  Playwright — deterministic user flows, LLM stubbed
            ├─────────────┤
            │ Integration │  Route handlers + real Postgres (Testcontainers), LLM mocked
            ├─────────────┤
            │    Unit     │  pure logic: Zod contracts, complexity, taxonomies, mappers
            └─────────────┘
                  │
                  ▼  many, fast, low-level
   ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─
            ┌─────────────┐
            │   Evals     │  NOT a test gate — quality scoring of real LLM output (offline)
            └─────────────┘
```

---

## Unit (Vitest)

Fast, no I/O, run constantly in watch mode — the TDD companion.
Unit tests live in `tests/unit/<feature>/` and use the `*.test.ts` suffix.

Targets:
- **The LLM output contract** (`agent/schema.ts`): valid payloads parse; malformed/out-of-enum
  payloads reject. This is written *first*.
- **Derived complexity**: `count(biases)+count(risks)+count(alternatives)`, including the
  no-ready-analysis case.
- **Taxonomy guards**: category/bias values map to the fixed enums; unknown values rejected.
- **Pure mappers / formatters**, validation schemas, i18n message key presence.

---

## Component (Vitest + jsdom)

Component tests live in `tests/component/<feature>/` and use the `*.test.tsx` suffix. They cover
deterministic React behavior, accessibility-facing controls, and component wiring that benefits
from rendering in jsdom.

Rules:
- Mock browser/theme/provider boundaries that would otherwise make the test depend on local
  storage, OS settings, network, or timers.
- Keep these tests in the default `pnpm test` gate; they must stay offline and deterministic.
- Prefer small feature folders like `theme/`, `capture/`, or `dashboard/` rather than a generic
  `components/` bucket.

---

## Integration (Vitest + real Postgres)

The behaviour that unit tests can't reach: data flow through route handlers and the DB.
Integration tests live in `tests/integration/<feature>/` and use the
`*.integration.test.ts` / `*.integration.test.tsx` suffix. They run through
`pnpm test:integration`, not the default `pnpm test` gate.

- **Real PostgreSQL via Testcontainers** (or the CI Postgres service) with pgvector, migrated
  per run — so per-user isolation and queries are tested against the real engine, not a mock.
- **LLM provider is mocked** at the provider-wrapper boundary, returning canned structured
  payloads (success, schema-invalid, provider-error) so the pipeline's branching is exercised
  deterministically.
- Coverage:
  - `POST /api/decisions` → persists `Decision` + `Analysis(processing)` and returns
    immediately; agent trigger is invoked (mocked).
  - status transitions: `processing → ready`, `processing → failed (+reason)`.
  - **retry / re-analyze**: new version appended, prior versions retained.
  - **per-user isolation**: user A cannot read/modify user B's decisions (cross-user request
    denied).
  - **memory**: `load-memory` recall is scoped by `userId`; degrades to no-op when empty.

---

## End-to-end (Playwright) — deterministic flows only

E2E covers real user journeys through the built app, but **only deterministic ones**, so the
LLM is **stubbed** (the app talks to a fake provider returning fixed output). This keeps e2e
fast, free, and non-flaky.
Playwright specs live in `e2e/<feature>/` and use the `*.spec.ts` suffix.

Flows worth e2e:
- Sign in (Google mocked / Credentials), sign out, protected-route redirect.
- Capture a decision → see `processing` state → poll flips to `ready` → reflection renders.
- Failure path → `failed` state with reason → **Retry** → `ready`.
- History list → filter by category / present-bias → sort by complexity.
- Dashboard renders category/bias aggregates.
- Locale switch en ↔ uk; dark-mode toggle persists.

What e2e does **not** assert: the *content quality* of the reflection (that's evals).

---

<a id="agent-evals"></a>
## Agent evals — quality, not a gate

Because the LLM is non-deterministic, its output quality can't live in pass/fail CI without
flakiness. So evals are a **separate, scheduled** activity, fed by LangSmith traces:

```
real/seed runs ─▶ LangSmith dataset ─▶ scorers ─▶ quality dashboard (tracked over time)
                                       ├─ structural: valid schema, enums in catalog, non-empty lists
                                       └─ judgmental: LLM-as-judge — relevance, are biases plausible,
                                                       are alternatives non-trivial, locale correct
```

- **Structural scorers** are deterministic and *could* run in CI as a smoke check on a couple
  of canned prompts (cheap), but the **judgmental scorers** (LLM-as-judge) run on a schedule /
  before notable prompt changes, not on every commit.
- Evals gate **prompt and model changes**, not application code. A prompt edit that drops
  quality scores is caught here.
- Regression guard: a small curated set of decisions with known-good expected *shapes*
  (e.g. "a sunk-cost scenario should surface sunk-cost bias").

---

## What gets mocked where (summary)

| Layer | Postgres | LLM provider | Embeddings |
|-------|----------|--------------|------------|
| Unit | — (no I/O) | — (pure logic only) | — |
| Integration | **real** (Testcontainers) | **mocked** (canned payloads) | mocked |
| E2E | **real** (test DB) | **stubbed** (fake provider) | stubbed |
| Evals | real/seed | **real OpenAI model** | real |

The one rule that keeps the suite trustworthy: **only evals call a real model.**

Shared test-only builders, fixtures, mocks, and setup utilities live under
`tests/support/{builders,fixtures,mocks,setup}/`. They are imported by tests but are not executable
test files.
</content>
