# Decision Mirror — Architecture

Decision Mirror is a private decision journal. A user records a decision; an LLM agent
reflects it back — surfacing likely cognitive biases, missed alternatives, failure modes,
and hidden assumptions — so the user can see a choice from the outside before it becomes a
regret.

This document is the entry point to the architecture. Each numbered area below links to a
detailed file in [`architecture/`](./architecture/). Product requirements live in
[`openspec/changes/build-decision-mirror/`](./openspec/changes/build-decision-mirror/);
this set of documents covers **how** we build it.

---

## Guiding principles

1. **One language, one deployment, one datastore.** The whole system is TypeScript, ships as
   a single Next.js app on Vercel, and persists everything in one PostgreSQL instance. Every
   added moving part must earn its place.
2. **TDD is non-negotiable.** Tests are written before implementation. This is encoded in
   [`AGENTS.md`](./AGENTS.md) and [`CLAUDE.md`](./CLAUDE.md) so both humans and AI agents
   follow it. See [05 — Testing](./architecture/05-testing.md).
3. **The LLM boundary is contract-first.** The agent returns structured, schema-validated
   output. Non-determinism is contained behind that boundary so the rest of the system —
   and its tests — stay deterministic.
4. **Observability is built in, not bolted on.** Errors, product behaviour, and agent
   reasoning are each traced from day one. See [04 — Observability](./architecture/04-observability.md).
5. **Seams over scale.** We ship the simplest thing that works, but where we know the
   scale-up path (durable queue, separate agent service) we make the seam intentional and
   document it, rather than painting over it.

---

## System at a glance

```
Browser
  │  (shadcn/ui · next-themes dark mode · next-intl en/uk)
  ▼
Next.js App Router (Vercel)
  ├─ Server Components — render history, dashboard, detail views
  ├─ Route Handlers     — capture, status polling, retry/re-analyze
  ├─ Auth.js v5         — Google OAuth + email/password (Credentials)
  └─ after()/waitUntil  — fire the agent run after the response is sent
        │
        ▼
LangGraph.js (in-process StateGraph)
  load-memory → analyze (LLM, structured) → validate (Zod) → persist + remember
        │
        ▼
PostgreSQL  (single instance)
  ├─ Prisma            — User / Decision / Analysis (relational, version history)
  ├─ pgvector          — long-term cross-decision memory (semantic recall)
  └─ PostgresSaver     — LangGraph checkpointer (per-run thread state, retry/resume)

Cross-cutting: Sentry (errors/perf) · PostHog (product + business metrics) · LangSmith (agent traces)
```

---

## Architecture documents

| # | Area | Covers |
|---|------|--------|
| 01 | [Developer Experience](./architecture/01-dev-experience.md) | Project structure, linting/formatting, naming & file conventions, the TDD workflow, local tooling, pre-commit hooks |
| 02 | [Stack](./architecture/02-stack.md) | Frontend, backend, database, the LangGraph.js agent, agent memory (pgvector + checkpointer), and authentication |
| 03 | [UI / UX](./architecture/03-ui-ux.md) | shadcn/ui design system, dark theme, internationalization (en + uk), and how localization interacts with LLM output |
| 04 | [Observability](./architecture/04-observability.md) | Sentry, PostHog, LangSmith; production monitoring, business/product monitoring, and the agent-quality signals |
| 05 | [Testing](./architecture/05-testing.md) | The testing pyramid, TDD doctrine, unit/integration boundaries, Playwright e2e on deterministic flows, and agent **evals** (kept out of the TDD loop) |
| 06 | [CI/CD](./architecture/06-ci-cd.md) | GitHub Actions pipeline, ephemeral Postgres for tests, Vercel deployment (preview-per-PR, prod-on-main), migrations, and secrets |

---

## Key decisions (and where the detail lives)

| Decision | Choice | Rationale | Detail |
|----------|--------|-----------|--------|
| Stack | Next.js App Router + TypeScript on Vercel | Single full-stack codebase; matches host | [02](./architecture/02-stack.md) |
| Database | PostgreSQL + Prisma | Clean relational model with version history | [02](./architecture/02-stack.md) |
| Agentic service | **LangGraph.js, in-process** | One deploy, all TypeScript, reuses `after()`/`waitUntil` | [02](./architecture/02-stack.md) |
| Agent memory | **Cross-decision long-term via pgvector** (same Postgres) + checkpointer for run state | Richer reflections that recall prior patterns, no new infra | [02](./architecture/02-stack.md) |
| Auth | Auth.js v5 — **Google OAuth + email/password** | "Real auth" with Google sign-in; both behind one interface | [02](./architecture/02-stack.md) |
| LLM | OpenAI Responses API, Structured Outputs, prompt caching | Strong structured-output ergonomics; project default | [02](./architecture/02-stack.md) |
| UI kit | **shadcn/ui** (Tailwind + Radix) | Pairs with next-themes + Recharts; i18n via next-intl | [03](./architecture/03-ui-ux.md) |
| i18n | next-intl, **English + Ukrainian** | UI localized; LLM free-form output generated in user's locale | [03](./architecture/03-ui-ux.md) |
| Errors/perf | Sentry | Client + server + edge coverage in one SDK | [04](./architecture/04-observability.md) |
| Product/business | PostHog | Funnels, retention, feature flags, business KPIs | [04](./architecture/04-observability.md) |
| Agent tracing | LangSmith | Native to LangChain/LangGraph; per-run traces + evals | [04](./architecture/04-observability.md) |
| Testing | Vitest + Playwright; TDD mandatory | Fast unit/integration; deterministic e2e with stubbed LLM | [05](./architecture/05-testing.md) |
| CI/CD | GitHub Actions + Vercel | Lint/typecheck/test gate; preview-per-PR, prod-on-main | [06](./architecture/06-ci-cd.md) |

---

## The async analysis flow (the architecturally hardest path)

The requirement "save the record, then analyze in the background, with visible status" is the
crux of the design. On serverless there is no long-lived worker, so:

```
POST /api/decisions
  1. validate input (Zod)
  2. persist Decision + Analysis(status=processing)   ──► return 201 immediately
  3. waitUntil(runAgent(decisionId))                      (work continues post-response)

runAgent  (LangGraph.js)
  load-memory ─► analyze ─► validate ─► persist results, status=ready
                                   └─► on error / invalid: status=failed (+reason)

Client
  polls GET /api/decisions/:id/status while any analysis is `processing` (with backoff),
  stops once settled. Stuck-in-processing past a timeout is surfaced as retryable.
```

This stays inside one deployment. The documented scale-up seam (a durable queue / cron
drainer, or promoting the in-process graph to a separate LangGraph service) is described in
[02 — Stack](./architecture/02-stack.md#scale-up-seam) and is **not** built now.
</content>
</invoke>
