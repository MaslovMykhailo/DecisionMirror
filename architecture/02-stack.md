# 02 — Stack

All TypeScript. One Next.js deployment on Vercel. One PostgreSQL instance serving relational
data, vector memory, and agent checkpoints.

---

## Frontend

- **Next.js (App Router) + React, TypeScript.** Server Components render the data-heavy views
  (history list, decision detail, dashboard); Client Components handle interactive bits
  (capture form, status polling, theme/locale switchers, charts).
- **shadcn/ui** (Tailwind + Radix) for the component layer — see [03 — UI/UX](./03-ui-ux.md).
- **Recharts** for the dashboard, fed by server-side aggregation queries.
- **next-themes** for dark mode; **next-intl** for en/uk localization.

Data fetching:
- Reads → Server Components query Prisma directly (no client round-trip).
- Mutations → Server Actions or Route Handlers, validated with the same Zod schemas.
- Live status → a small client hook polls the status endpoint with backoff while any analysis
  is `processing`, and stops when settled.

---

## Backend

There is no separate backend service. The "backend" is Next.js **Route Handlers** and
**Server Actions** running on Vercel, plus the in-process agent.

Surface (illustrative):

| Endpoint | Purpose |
|----------|---------|
| `POST /api/decisions` | Validate, persist `Decision` + `Analysis(processing)`, trigger agent, return immediately |
| `GET /api/decisions/:id/status` | Return current analysis status for polling |
| `POST /api/decisions/:id/reanalyze` | Append a new `Analysis(processing)` version, trigger agent |
| `POST /api/decisions/:id/retry` | Re-trigger the agent for a `failed`/stalled analysis |
| `GET` (Server Components) | History, detail, dashboard aggregations — scoped to the session user |

Every handler resolves the session first and scopes all queries by `userId` — per-user
isolation is enforced server-side, never trusted from the client.

### Background execution

```
request ─▶ persist rows ─▶ return 201
                            │
                  waitUntil(runAgent(decisionId))   ← continues after response is flushed
```

Uses Next.js `after()` / Vercel `waitUntil`, so the agent runs without blocking the response
and without a separate worker. The client learns the outcome by polling.

<a id="scale-up-seam"></a>
### Scale-up seam (documented, not built)

Post-response work on serverless is not *durably* guaranteed — the process can end before the
graph finishes. Mitigation now: any analysis stuck in `processing` past a timeout is surfaced
as **retryable**, so a user is never stranded. The production evolution, behind the same
`runAgent(decisionId)` interface:

```
now:     waitUntil(runAgent(id))          # in-process, best-effort
later:   enqueue(id) ──▶ durable queue ──▶ worker/cron drainer ──▶ runAgent(id)
or:      promote agent/ to a standalone LangGraph service called over HTTP
```

Because `agent/` already has a single public entry and owns no UI/HTTP concerns, this is a
swap, not a rewrite.

---

## Database

- **PostgreSQL**, hosted (Neon or Vercel Postgres). **Prisma** for typed access and migrations.
- Relational model (matches the existing design):

```
User 1───N Decision 1───N Analysis        (Analysis rows are append-only versions)
                              │
                  current = latest `ready` Analysis
```

- `Analysis` holds: `status` (`processing|ready|failed`), `category` (enum), `biases`
  (catalog enum + explanation), free-form lists (missed alternatives, premortem risks,
  assumptions, warning signs), `failureReason`, `version`, timestamps.
- **Derived complexity** is computed (not stored as an LLM field):
  `count(biases) + count(premortem_risks) + count(missed_alternatives)`.

Three roles, one instance:

| Concern | Mechanism |
|---------|-----------|
| Relational data | Prisma models / migrations |
| Long-term agent memory | **pgvector** extension (embeddings + similarity search) |
| Agent run state | LangGraph **PostgresSaver** checkpointer (its own tables) |

pgvector and checkpointer tables live alongside Prisma's. Prisma owns the relational schema;
the vector table and checkpointer tables are created via SQL migration (pgvector columns are
accessed through raw queries / a thin helper rather than Prisma's typed layer).

---

## Agentic service — LangGraph.js (in-process)

The agent is a compiled **`StateGraph`** from `@langchain/langgraph`, invoked in-process by
`runAgent(decisionId)`.

```
                  ┌──────────────┐
   START ───────▶ │ load-memory  │  retrieve top-k similar past decisions for this user
                  └──────┬───────┘  (pgvector) → compact "prior patterns" context
                         ▼
                  ┌──────────────┐
                  │   analyze    │  call Claude with structured-output tool;
                  └──────┬───────┘  inputs: situation, decision, reasoning, locale, prior patterns
                         ▼
                  ┌──────────────┐
                  │   validate   │  parse against Zod contract (agent/schema.ts)
                  └──────┬───────┘  invalid → route to `fail`
                  ┌──────┴───────┐
                  ▼              ▼
          ┌────────────┐   ┌──────────┐
          │  persist   │   │   fail   │  status=failed + reason (retryable)
          │  +remember │   └──────────┘
          └─────┬──────┘
                ▼  write results (status=ready) AND write a memory record (embed + store)
               END
```

- **LLM:** Anthropic Claude via a single provider wrapper. Structured output is enforced
  (tool/JSON schema), parsed with **Zod** before persistence; a validation failure marks the
  analysis `failed` (and therefore retryable). Static system/instruction prefix uses
  **prompt caching**. Model is env-configurable; demo defaults to a fast/cheap model.
- **Controlled taxonomies:** `category` is a fixed enum; biases are a fixed catalog of 8. The
  model must select from these, keeping filtering and dashboard aggregation deterministic.
- **Why in-process LangGraph (vs a Python service):** keeps one language and one deployment,
  reuses `after()`/`waitUntil`, and the graph structure still buys us composable nodes,
  retries/resume via the checkpointer, and LangSmith tracing — without standing up a second
  runtime.

---

## Agent memory

Two distinct kinds of memory, both on the same Postgres:

| Kind | Scope | Store | Purpose |
|------|-------|-------|---------|
| **Thread / run state** | one analysis run | LangGraph PostgresSaver (checkpointer) | Resume/retry a multi-step graph run without redoing finished steps |
| **Long-term memory** | across a user's decisions | **pgvector** table | Recall semantically similar past decisions so reflections notice repeated patterns |

Long-term memory loop:

```
on new analysis:
  embed(situation + decision)  ──▶  pgvector similarity search (scoped to userId, top-k)
       └─▶ summarize matches into "you have previously faced… and showed … bias"
       └─▶ feed as context into the `analyze` node
after `ready`:
  embed + store a memory record for this decision  (so future decisions can recall it)
```

- **Embeddings:** Voyage AI (`voyage-3`, pairs with Anthropic) by default; OpenAI
  `text-embedding-3-small` is a drop-in alternative behind the same embeddings wrapper.
- **Isolation:** every memory query is filtered by `userId` — no cross-user recall, ever.
- **Phasing:** this is the one feature beyond a "polished demo." The pipeline works fully
  without it (the `load-memory` node degrades to a no-op when no memories exist), so memory
  can land in a second pass without touching `analyze`/`validate`/`persist`. The dashboard
  already provides cross-decision patterns *deterministically*; agent memory makes the
  *reflection itself* pattern-aware.

> **Open sub-question to confirm during build:** whether to also keep a short rolling
> per-user "profile" memory (e.g., a running summary of recurring biases) in addition to
> per-decision vector records. Vector recall is the baseline; a profile summary is a cheap
> optional enhancement.

---

## Authentication

- **Auth.js v5 (NextAuth)** with **two providers behind one interface**:
  - **Google OAuth** — the requested "Sign in with Google".
  - **Credentials** (email + password, bcrypt-hashed) — satisfies the spec's signup/login
    scenarios.
- **Prisma adapter** persists `User`/`Account`/`Session`. Because the Credentials provider
  requires it, the **session strategy is JWT** (works for both providers).
- Session is read server-side in Route Handlers and Server Components; protected routes
  redirect unauthenticated visitors to the sign-in flow.
- All decision/analysis data is scoped by `userId` from the session — see the per-user
  isolation requirement in the authentication spec.

> **Note vs existing design.md:** the original D3 chose Credentials-only with JWT and left
> Google as "later." This architecture promotes Google to a first-class provider now, which
> is a *modification* to D3 — flagged for capture back into `design.md`.
</content>
