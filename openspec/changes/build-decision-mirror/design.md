## Context

Decision Mirror is a greenfield application. It began as a fixed-scope assignment with a 2-day timebox; the current intent is a **polished demo** — shippable and single-deploy where possible, but with first-class internationalization, observability, testing, and CI/CD layered on. The evaluation explicitly weighs architecture, AI integration, and product thinking — not just feature completeness. Two deliverables are required: a public GitHub repository with a detailed README, and a deployed demo on a host such as Vercel.

> **Authoritative technical detail lives in [`ARCHITECTURE.md`](../../../ARCHITECTURE.md) and [`architecture/`](../../../architecture/).** This design doc records the product-shaping decisions and their rationale; the architecture docs expand each into concrete dev-ex, stack, UI/UX, observability, testing, and CI/CD guidance. The two must stay aligned — if one changes, update the other.

The hardest architectural requirement is "save the record, then run analysis in the background, and make status visible." On a serverless host there is no long-lived worker by default, so the async pipeline must be designed deliberately. The other non-trivial areas are the structured LLM contract, controlled taxonomies (so filtering and the dashboard are reliable), version history for re-analysis, and a derived complexity metric for sorting.

## Goals / Non-Goals

**Goals:**
- A complete, demo-solid mandatory core (auth → capture → background analysis + status → history → UX states) that stands on its own.
- A robust, observable async analysis pipeline with explicit `processing` / `ready` / `failed` states and retry.
- A structured, validated LLM output contract using controlled taxonomies for category and biases.
- All bonus features: dashboard, dark theme, re-analysis (with version history), filtering, and sorting (including derived complexity).
- One deployable artifact with a clear README and minimal setup.

**Non-Goals:**
- Multi-tenant/organization features, sharing, or collaboration.
- Real-time streaming of analysis to the UI (polling is sufficient).
- A durable distributed job queue or external worker infrastructure.
- Mobile-native apps; the target is a responsive web app.
- Fine-grained role-based authorization beyond "a user owns their own decisions."

## Decisions

### D1 — Stack: Next.js (App Router) + TypeScript, deployed on Vercel
Single full-stack codebase (UI + API route handlers) deploys natively to Vercel, which is the suggested host. Server Components plus route handlers cover both rendering and the async API needs without a second service.
- *Alternatives considered:* separate SPA + Node/Express API (more moving parts, two deploys); Remix (viable, smaller ecosystem fit for the structured-output + charts tooling here).

### D2 — Persistence: PostgreSQL via Prisma
Relational model fits cleanly: `User` 1—N `Decision` 1—N `Analysis` (versions). Prisma gives typed access and quick migrations, important under the timebox. Hosted Postgres (Vercel Postgres / Neon) keeps deploy friction low.
- *Alternatives considered:* SQLite (simplest locally, but serverless persistence on Vercel is awkward); a document store (weaker fit for the relational version history and aggregation queries the dashboard needs).

### D3 — Auth: Auth.js (NextAuth v5) with Google OAuth + email/password (Credentials), session via JWT
Satisfies "real auth" with first-class Next.js integration and per-request session access in route handlers and Server Components. **Two providers behind one interface:** Google OAuth ("Sign in with Google") and Credentials (email + password, bcrypt-hashed). The Prisma adapter persists `User`/`Account`/`Session`; because the Credentials provider requires it, the session strategy is **JWT** (which also works for the OAuth provider). All decision/analysis data is scoped by the session `userId`.
- *Alternatives considered:* Credentials-only with Google deferred (the original plan; Google is now first-class); rolling custom auth (more code, more risk); a hosted auth SaaS (extra vendor + config for little gain here).

### D4 — Background analysis on serverless
On submit, the API persists the decision and an `Analysis` row with `status=processing`, returns immediately, and triggers the analysis work out-of-band so the request is not blocked. The work runs in a dedicated analysis routine that calls the LLM and updates the `Analysis` row to `ready` (with results) or `failed` (with an error reason). The client reflects state by **polling** a status endpoint while any analysis is `processing`.

Chosen mechanism: trigger the analysis via Next.js post-response execution (`after()` / Vercel `waitUntil`) so the work continues after the response is sent. The actual unit of work is the in-process agent entry `runAgent(decisionId)` (see D5). This keeps everything in one deployment with no external queue.
- *Alternatives considered:* synchronous analysis in the request (violates the "background + status" requirement and risks request timeouts); a real queue (SQS/Upstash QStash) or cron drainer (more robust at scale, but over-engineered and slower to ship for a single-instance demo — noted as the scale-up path in Risks).
- *Scale-up seam:* because the agent sits behind a single `runAgent(decisionId)` entry that owns no UI/HTTP concerns, the post-response trigger can later be swapped for a durable queue/worker, or the agent promoted to a standalone service, without rewriting the pipeline.

### D5 — Agentic pipeline: LangGraph.js (in-process) wrapping OpenAI with enforced structured output
The analysis runs as a compiled LangGraph.js `StateGraph` invoked in-process by `runAgent(decisionId)` — no separate service or second runtime. The graph nodes are `load-memory → analyze → validate → persist+remember`, with a `fail` branch. The `analyze` node calls OpenAI through a single provider wrapper; the model returns analysis through Responses API Structured Outputs so output is machine-validated; results are parsed against a strict Zod schema before persistence, and a schema-validation failure routes to `fail` (status `failed`, eligible for retry). Default model favors latency/cost for a demo and is configurable via env. Prompt construction keeps the static system/instruction prefix and schema ahead of dynamic decision content so OpenAI prompt caching can apply. The graph buys composable nodes, retry/resume via a checkpointer (see D10), and per-run tracing via LangSmith (see D13).
- *Alternatives considered:* a bare OpenAI SDK call inline in `after()` (simplest, but no node composition, no checkpointer resume, weaker tracing story); a **separate Python LangGraph service** (full ecosystem + native memory primitives, but two deploys and two languages — rejected to keep one TypeScript deployment); LangGraph Platform managed cloud (built-in persistence/memory but vendor lock + cost); free-text completion then regex/parse (brittle); a different LLM provider (equivalent capability, but not the selected project default).

### D6 — Controlled taxonomies for category and biases
`category` is a fixed enum (`Career`, `Financial`, `Relationship`, `Health`, `Business/Work`, `Education`, `Lifestyle`, `Other`). Cognitive biases are constrained to a fixed catalog of 8 (confirmation, availability, loss aversion, sunk cost, overconfidence, anchoring, status quo, present bias). The LLM must select from these enums. This makes filtering deterministic and the dashboard aggregations clean (no synonym drift). Missed alternatives, premortem risks, assumptions, and warning signs remain free-form text lists.
- *Alternatives considered:* free-form labels (richer but unreliable to group); hybrid with an "other" escape hatch (deferred to keep aggregation simple).

### D7 — Re-analysis = append-only version history
Each analysis run is a new `Analysis` row linked to the decision, ordered by creation. The decision's "current" analysis is the latest `ready` version. The detail view shows the current analysis and allows viewing prior versions. Re-analysis creates a fresh `processing` row and runs the same pipeline.
- *Alternatives considered:* overwrite-in-place (simpler, but loses the "see how the reflection changed" story and the assignment's re-analysis intent is richer as history).

### D8 — Derived complexity (no extra LLM field)
Complexity is computed deterministically from the latest ready analysis:
`complexity = count(biases) + count(premortem_risks) + count(missed_alternatives)`.
Used for the "sort by complexity" bonus. Decisions without a ready analysis sort last/neutral.
- *Alternatives considered:* LLM-scored 1–10 (one more field to prompt/validate; deterministic derivation is free and explainable).

### D9 — UI system, theming, and charts: shadcn/ui
Component layer is **shadcn/ui** (Tailwind + Radix primitives, copied into the repo so we own the code; accessible by default). Dark theme via `next-themes` with a persisted preference and system default, driven by a CSS-variable token layer. Dashboard charts via Recharts fed by server-side aggregation queries, styled to the same tokens.
- *Alternatives considered:* Ant Design (batteries-included components + built-in theming/i18n, faster forms/tables, but heavier and more opinionated styling, and a second theming/i18n system to reconcile with next-themes/next-intl).

### D10 — Agent memory: long-term (pgvector) + run state (checkpointer), both on the same Postgres
Two distinct memories, no new infrastructure. **Long-term cross-decision memory:** the `load-memory` node embeds the new situation+decision and runs a `userId`-scoped pgvector similarity search to recall semantically similar past decisions, summarizing them into "prior patterns" context for the `analyze` node; after a `ready` result the decision is embedded and stored for future recall. **Run state:** a LangGraph `PostgresSaver` checkpointer persists graph state per run so a retry can resume rather than redo finished steps. Embeddings default to Voyage AI `voyage-3`, with OpenAI as a drop-in alternative behind the embeddings wrapper. Memory recall is always scoped by `userId` — no cross-user recall. This is the one capability beyond a strict "polished demo": the pipeline works fully without it (`load-memory` degrades to a no-op when no memories exist), so it can ship in a second pass without touching `analyze`/`validate`/`persist`.
- *Alternatives considered:* stateless per analysis (simplest; the dashboard already gives cross-decision patterns *deterministically*, but the reflection itself wouldn't be pattern-aware); a dedicated vector DB (extra infra; pgvector on the existing Postgres is sufficient); a separate per-user "profile" summary memory (a cheap optional enhancement on top of vector recall — deferred, noted as an open sub-question).

### D11 — Internationalization: next-intl, English + Ukrainian
UI strings are localized with **next-intl** (`app/[locale]/…`, messages in `messages/en.json` + `messages/uk.json`, locale persisted via cookie, `en` default). Controlled taxonomies (categories, the 8 biases) are **translated as labels in the UI** while the DB stores the language-neutral enum value — so filtering and dashboard aggregation stay deterministic across locales. **LLM free-form output is generated in the user's locale** by passing `locale` into the `analyze` prompt (a Ukrainian user gets Ukrainian reflections); enum-backed fields are never model-translated. A re-analysis after a language switch produces text in the new language while prior versions keep their original — acceptable, since version history records what was said at the time.
- *Alternatives considered:* English-only (drops a stated requirement); translating LLM output post-hoc (extra cost/latency and quality loss vs. generating in-locale).

### D12 — Observability: Sentry + PostHog + LangSmith
Three non-overlapping layers. **Sentry** for errors/performance across browser, server, and edge runtimes (releases tagged by git SHA; decision text scrubbed from payloads). **PostHog** for product/business analytics, funnels, retention, and feature flags (e.g. gating the memory rollout); events carry IDs/enums/counts/durations, never raw decision text. **LangSmith** for agent tracing — per-node inputs/outputs, token/cost, and which memories were recalled — and as the source for offline evals (see D13). LangSmith necessarily sees decision content, so its project is team-scoped with retention limits.
- *Alternatives considered:* PostHog-only error tracking (weaker than Sentry for stack traces/release health); no agent-specific tracing (Sentry/PostHog can't answer "did the agent reason well?").

### D13 — Testing & TDD: deterministic gate, evals out of the loop
TDD is mandatory (encoded in `AGENTS.md`/`CLAUDE.md`). Pyramid: **Vitest** unit (Zod contract, complexity derivation, taxonomy guards, pure logic) → **integration** against real Postgres+pgvector (Testcontainers/CI service) with the **LLM mocked** → **Playwright e2e** on deterministic flows with the **LLM stubbed**. The LLM is mocked/stubbed everywhere in the commit gate; **only evals call a real model**, and evals are not a commit gate — they score reflection quality offline (structural + LLM-as-judge via LangSmith datasets) and gate prompt/model changes, not application code.
- *Alternatives considered:* including live-model assertions in CI (flaky, slow, costly); skipping e2e (loses confidence on the auth→capture→status→history journey).

### D14 — CI/CD: GitHub Actions gate + Vercel deploy
GitHub Actions runs lint+format, typecheck, unit+integration (Postgres+pgvector service container, `prisma migrate deploy`), build, then Playwright e2e (LLM stubbed) — all required checks on `main`, no real-model calls in CI. Vercel's Git integration deploys: a preview per PR, production on merge to `main`; `prisma migrate deploy` runs on release with additive migrations; rollback is redeploying the prior deployment.
- *Alternatives considered:* deploying from CI directly (Vercel's Git integration is simpler and gives preview-per-PR for free); running migrations manually (error-prone for a demo).

## Risks / Trade-offs

- **Post-response work is not durably guaranteed on serverless** (process could end before completion) → On each load, any analysis stuck in `processing` past a timeout threshold is surfaced as retryable; a manual retry re-triggers the analyze endpoint. The scale-up path (durable queue / cron drainer) is documented in the README as the production evolution.
- **LLM returns malformed or schema-invalid output** → Enforce structured output, validate with Zod, and on failure set `status=failed` with a reason; retry is a first-class action, not a dead end.
- **LLM latency/cost during a live demo** → Default to a fast, cheaper model via env; cache the static prompt prefix; show clear `processing` UX so latency reads as designed behavior.
- **Polling overhead** → Poll only while at least one analysis is `processing`, with backoff, and stop once all are settled.
- **Provider key exposure** → All LLM calls are server-side only; the key is never shipped to the client; the internal analyze endpoint is authenticated.
- **Scope vs. polish** → Build order front-loads the mandatory core so a partial result is still a complete, gradeable submission; bonuses and the polish layers (i18n, observability, agent memory) layer on after. **Agent memory (D10) is the explicit stretch** — the pipeline runs fully without it, so it can be dropped or deferred without affecting the core.
- **In-process serverless execution time** → the full graph (memory recall + OpenAI call + embedding write) must fit within the function limit; the polling + retry/stalled-timeout design means an interrupted run is recoverable, and the scale-up seam (D4) is the documented path if runs grow.
- **i18n + LLM output drift** → enum-backed fields stay language-neutral (deterministic filtering/dashboard); only free-form prose is generated per-locale, so version history may mix languages across a language switch — accepted and surfaced in the UI.
- **Telemetry privacy** → decision content never leaves to Sentry/PostHog (IDs/enums/counts only); LangSmith sees content by necessity and is scoped + retention-limited.

## Migration Plan

Greenfield — no data migration. Deployment steps: provision hosted Postgres, set environment variables (database URL, auth secret, LLM API key/model), run Prisma migrations on deploy, and connect the GitHub repo to Vercel for the demo. Rollback is redeploying the previous commit; schema changes are additive during the build.

## Open Questions

- Confirm the final LLM model/default and any per-environment overrides.
- Confirm the embeddings provider/model (default: Voyage `voyage-3`; OpenAI `text-embedding-3-small` as the alternative).
- Whether to add a short per-user "profile" memory (running summary of recurring biases) on top of pgvector per-decision recall (D10) — vector recall is the baseline.
- Whether prior analysis versions need a visible diff, or simply a version switcher (current plan: switcher).

> Resolved since the initial draft: Google OAuth is now first-class (D3); the agent runs as in-process LangGraph.js (D5); agent memory uses pgvector + checkpointer (D10); i18n is en+uk via next-intl (D11); observability is Sentry + PostHog + LangSmith (D12).
