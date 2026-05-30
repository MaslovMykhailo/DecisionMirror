<!--
TDD is mandatory (see AGENTS.md / CLAUDE.md and architecture/05-testing.md). Every behavioural
task below is written test-first: a failing test precedes the implementation that satisfies it.
Section 12 covers the cross-cutting test harness; per-feature tests are part of each feature task.
The LLM is mocked/stubbed in all gate tests — only evals (12.5) call a real model.
-->

## 1. Project setup and foundation

- [ ] 1.1 Scaffold a Next.js (App Router) + TypeScript (strict) project with Tailwind and pnpm
- [ ] 1.2 Configure dev-ex tooling: ESLint (flat config) + Prettier, `tsc --noEmit`, Husky + lint-staged pre-commit, path alias `@/`, naming/file conventions (see architecture/01)
- [ ] 1.3 Initialize **shadcn/ui** (Radix + Tailwind), define the CSS-variable design-token layer for light/dark
- [ ] 1.4 Add and configure Prisma; define `User`, `Account`, `Session`, `Decision`, and `Analysis` (version) models with relations and the status enum
- [ ] 1.5 Enable the **pgvector** extension and the long-term-memory table; provision local (docker compose) and hosted PostgreSQL; wire `DATABASE_URL` and run the initial migration
- [ ] 1.6 Add environment configuration (`.env.example`): `AUTH_SECRET`, `AUTH_GOOGLE_ID/SECRET`, `ANTHROPIC_API_KEY` + model, embeddings key, `SENTRY_DSN`, `POSTHOG_KEY`, `LANGSMITH_API_KEY`; document all required vars
- [ ] 1.7 Define shared TypeScript types and the category enum + cognitive-bias catalog as a single source of truth (Zod-backed)

## 2. Internationalization foundation

- [ ] 2.1 Configure **next-intl** with `app/[locale]/…`, `en`/`uk` locales, cookie-persisted preference, `en` default
- [ ] 2.2 Create `messages/en.json` and `messages/uk.json`; translate UI chrome, controlled-taxonomy labels (categories + 8 biases), and UX-state copy
- [ ] 2.3 Build a language switcher; ensure locale-correct date/number/relative-time formatting

## 3. Authentication

- [ ] 3.1 Configure Auth.js (NextAuth v5) with the **Google OAuth** and **Credentials** providers, Prisma adapter, JWT sessions
- [ ] 3.2 Implement signup (email + password) with bcrypt hashing and duplicate-email handling
- [ ] 3.3 Implement login, logout, Google sign-in, and session-retrieval helpers for route handlers and Server Components
- [ ] 3.4 Add route/middleware protection and per-user data scoping (`userId`) for all decision/analysis access
- [ ] 3.5 Build signup and login pages (shadcn/ui, localized) with validation and field-level errors

## 4. Decision capture

- [ ] 4.1 Build the create-decision form (situation, decision, optional reasoning) with shared Zod client + server validation
- [ ] 4.2 Implement the create endpoint: persist the decision and an `Analysis` row in `processing`, scoped to the user
- [ ] 4.3 Trigger background analysis out-of-band via `after()`/`waitUntil` calling `runAgent(decisionId)`, without blocking submission

## 5. Agentic analysis pipeline (LangGraph.js, in-process)

- [ ] 5.1 Define the LLM output contract: a strict Zod schema (`agent/schema.ts`) for category, biases (+explanations), missed alternatives, premortem risks, key assumptions, warning signs — **test-first**
- [ ] 5.2 Implement the Anthropic Claude provider wrapper with structured/tool output and prompt caching of the static prefix (locale passed in for free-form output)
- [ ] 5.3 Author the analysis prompt/instruction templates (locale-aware; selects from the controlled taxonomies)
- [ ] 5.4 Build the LangGraph.js `StateGraph`: nodes `load-memory → analyze → validate → persist+remember` with a `fail` branch; compile behind `runAgent(decisionId)`
- [ ] 5.5 `validate` node: parse LLM output against the Zod contract; on invalid route to `fail`
- [ ] 5.6 `persist` path: write structured results, set status `ready`; `fail` path: set status `failed` with a human-readable reason
- [ ] 5.7 Implement the status query endpoint used by the client for polling

## 6. Agent memory (pgvector + checkpointer)

- [ ] 6.1 Implement the embeddings wrapper (Voyage `voyage-3` default; OpenAI alternative behind the same interface)
- [ ] 6.2 `load-memory` node: embed the new decision, run a `userId`-scoped pgvector top-k similarity search, summarize matches into "prior patterns" context (no-op when empty)
- [ ] 6.3 `remember` step: after a `ready` result, embed and store a memory record for future recall (scoped by `userId`)
- [ ] 6.4 Wire the LangGraph `PostgresSaver` checkpointer so runs can resume on retry
- [ ] 6.5 Verify cross-user isolation of memory recall (no cross-user leakage)

## 7. History: list and detail

- [ ] 7.1 Build the decision list view scoped to the user, showing summary, category, and status badge
- [ ] 7.2 Build the decision detail view showing original input alongside analysis results
- [ ] 7.3 Implement client polling that updates status while any analysis is `processing` (with backoff) and stops when settled
- [ ] 7.4 Render not-ready/failed states in detail and list with explanations
- [ ] 7.5 Add empty state for users with no decisions

## 8. UX states and theming

- [ ] 8.1 Implement consistent loading, error, and retry components across async views (shadcn/ui, localized)
- [ ] 8.2 Add dark theme via `next-themes` with persisted preference and system default
- [ ] 8.3 Verify all UX-state scenarios (loading, error+retry, analysis-not-ready, empty) render correctly in both locales

## 9. Retry and re-analysis

- [ ] 9.1 Implement retry action for `failed` analyses (re-trigger `runAgent`, move to `processing`)
- [ ] 9.2 Surface stalled `processing` analyses (past timeout threshold) as retryable
- [ ] 9.3 Implement re-analysis that appends a new `Analysis` version and runs the pipeline
- [ ] 9.4 Build version switcher in detail view; current analysis = newest `ready` version

## 10. Filtering, sorting, and complexity

- [ ] 10.1 Implement derived complexity (count of biases + premortem risks + missed alternatives from current analysis)
- [ ] 10.2 Implement filter by category and by presence of a specific bias
- [ ] 10.3 Implement sort by creation time and by complexity (no-ready decisions ordered last)
- [ ] 10.4 Wire filter/sort controls into the list view

## 11. Analytics dashboard

- [ ] 11.1 Implement server-side aggregation queries for category and bias frequency (user-scoped, ready analyses only)
- [ ] 11.2 Build dashboard charts (category frequency, bias frequency) with Recharts, themed to the tokens
- [ ] 11.3 Add dashboard empty state when no ready analyses exist

## 12. Testing harness (TDD) and evals

- [ ] 12.1 Set up Vitest (unit + integration) with coverage reporting; wire watch mode for the TDD loop
- [ ] 12.2 Set up integration tests against real Postgres+pgvector (Testcontainers/CI service) with the LLM provider mocked at the wrapper boundary
- [ ] 12.3 Unit-cover the deterministic core: Zod contract, complexity derivation, taxonomy guards, mappers, i18n message-key presence
- [ ] 12.4 Set up Playwright e2e on deterministic flows (auth, capture→processing→ready, failure→retry, filter/sort, dashboard, locale switch, dark mode) with the LLM **stubbed**
- [ ] 12.5 Set up the agent **eval** harness (LangSmith datasets; structural + LLM-as-judge scorers) — offline, not a commit gate; gates prompt/model changes

## 13. Observability

- [ ] 13.1 Integrate Sentry across browser/server/edge; upload source maps; tag releases by git SHA; scrub decision text from payloads
- [ ] 13.2 Integrate PostHog; emit the business event taxonomy (decision_created, analysis_started/ready/failed/retried, reanalysis_run, dashboard_viewed, locale_switched) with no raw decision text
- [ ] 13.3 Wire LangSmith tracing for `runAgent` (per-node I/O, tokens, recalled memories); scope the project + set retention
- [ ] 13.4 Build the core business dashboards (signup→first-decision→first-ready funnel; ready/failed/stalled reliability; time-to-ready p50/p95)

## 14. CI/CD

- [ ] 14.1 GitHub Actions: install (cached) → lint+format, typecheck, unit+integration (Postgres+pgvector service, `prisma migrate deploy`), build, Playwright e2e (LLM stubbed) — all parallelized where possible
- [ ] 14.2 Make the CI jobs required checks on `main`; ensure no real-model calls run in CI
- [ ] 14.3 Connect Vercel Git integration: preview deployment per PR, production on merge to `main`
- [ ] 14.4 Run `prisma migrate deploy` on release with additive migrations; document rollback (redeploy prior deployment)

## 15. Delivery

- [ ] 15.1 Write a detailed README: overview, architecture (link ARCHITECTURE.md), async pipeline + agent/memory explanation, setup, env vars, i18n, observability, and scale-up notes
- [ ] 15.2 Push to a public GitHub repository
- [ ] 15.3 Deploy to Vercel with hosted Postgres (pgvector) and environment variables; run migrations on deploy
- [ ] 15.4 Smoke-test the deployed demo end to end (sign in → create → analysis → history → dashboard) in both locales and confirm both links work
</content>
