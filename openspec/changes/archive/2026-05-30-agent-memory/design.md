## Context

The current agent graph already has the right high-level seam: `runAgent(decisionId)` builds
a LangGraph graph with `load-memory`, `analyze`, `validate`, `persist+remember`, and `fail`
nodes, and tests can inject a memory stub. The production path still defaults to a no-op
memory implementation, there is no embeddings wrapper, and durable LangGraph checkpointing
is not wired into graph invocation.

The data model intentionally keeps pgvector outside Prisma's typed schema. Prisma owns the
relational `User`, `Decision`, and `Analysis` models; memory and checkpoint tables live in
the same PostgreSQL instance and are accessed through raw SQL or LangGraph's checkpointer.
All work must preserve per-user isolation, deterministic tests, and the telemetry rule that
raw decision text never goes to Sentry or PostHog.

## Goals / Non-Goals

**Goals:**

- Add a server-only embeddings abstraction with Voyage `voyage-3` as the default and OpenAI
  as a provider-compatible alternative.
- Replace the no-op production memory dependency with real pgvector-backed recall and
  remember behavior.
- Keep memory recall scoped by `userId`, top-k bounded, and safe when no memories exist.
- Make remember idempotent per user-owned decision so retries and re-analysis do not create
  duplicate recall records.
- Compile or invoke the graph with a PostgreSQL LangGraph checkpointer and a stable
  per-analysis `thread_id`.
- Cover the behavior test-first with mocked embeddings, mocked analysis providers, and real
  PostgreSQL + pgvector where query semantics matter.

**Non-Goals:**

- No user-facing memory management UI.
- No rolling per-user profile summary beyond per-decision vector memories.
- No reranker or second LLM call for memory summarization.
- No real embeddings, OpenAI, or Voyage calls in unit, integration, or e2e tests.
- No changes to the public `runAgent(decisionId)` entrypoint expected by route handlers.

## Decisions

### Keep memory behind the graph dependency seam

The graph should continue to depend on an `AgentMemory` interface so node tests can inject
simple stubs. The interface should become richer than the current placeholder:

- `recall` receives `userId`, `decisionId`, and the loaded decision input so it can embed the
  current decision without re-querying relational data.
- `remember` receives `userId`, `decisionId`, `analysisId`, the decision input, and the
  validated analysis output so it can construct the memory document and trace it to the
  ready analysis that produced it.

Alternative considered: let the memory repository fetch the decision and analysis again.
That would duplicate relational reads already performed by `load-memory` and make the
memory layer responsible for ownership checks that the graph already established.

### Use a small embeddings wrapper, not provider SDKs in nodes

Create an `AgentEmbeddings` abstraction with query/document methods. The Voyage
implementation maps recall embeddings to query input and stored memory embeddings to
document input; the OpenAI implementation satisfies the same interface. Model name,
provider, and credentials are resolved server-side from environment configuration.

Alternative considered: call Voyage directly from the memory repository. That would make
provider swapping and deterministic tests harder, and it would couple pgvector query logic
to one SDK.

### Store one current memory row per user-owned decision

The memory table should be recreated or migrated to contain `id`, `userId`, `decisionId`,
`analysisId`, `content`, `embedding`, `createdAt`, and `updatedAt`, plus a unique constraint
on `(userId, decisionId)`. Remember uses an upsert: re-analysis updates the memory document,
source analysis, and vector for that decision.

The embedding vector dimension must match the configured default embeddings model. The
baseline remains `vector(1024)` for the requested `voyage-3` default; implementation should
fail fast in tests if the configured provider returns a different dimension.

Alternative considered: append a memory row for every analysis version. That preserves more
history but makes recall noisy, increases duplicate matches for one decision, and requires
additional filtering before the model sees prior patterns.

### Make prior-pattern summarization deterministic

Recall should retrieve top-k memory rows ordered by vector distance, filtered by `userId`
and excluding the current `decisionId`. The memory layer then formats bounded strings from
stored memory content, similarity metadata, category, and bias identifiers. This is the
"prior patterns" context passed to the provider.

Alternative considered: run a second LLM call to summarize recalled memories. That adds
latency, cost, and nondeterminism to the critical path. A deterministic formatter keeps the
test loop offline and still gives the analyzer useful context.

### Use `PostgresSaver` with an analysis-scoped thread id

Add `@langchain/langgraph-checkpoint-postgres` and create a checkpointer from
`DATABASE_URL` for normal runtime. LangGraph docs require a `configurable.thread_id` when a
checkpointer is used; `runAgent` should resolve the current processing analysis and use a
thread id derived from that analysis id, for example `analysis:<analysisId>`.

The graph should be compiled with the checkpointer, and tests should be able to compile
without one or inject an in-memory equivalent. Checkpoint setup belongs in the same
database setup path as other non-Prisma SQL concerns so serverless invocations are not
responsible for repeated DDL.

Alternative considered: use `decisionId` as the thread id. That risks checkpoint collisions
between separate analysis versions for the same decision.

## Risks / Trade-offs

- Vector dimension drift -> keep the memory migration and embeddings configuration paired,
  and add tests that reject vectors with the wrong dimension before insert.
- Checkpoint table setup drift -> document and automate the PostgresSaver setup path in the
  database workflow rather than relying on ad hoc production bootstrapping.
- Cross-user leakage through raw SQL -> put `userId` in every memory query and integration
  test recall with two users and near-identical vectors.
- Duplicate memory after retry -> enforce `(userId, decisionId)` uniqueness and implement
  remember as an upsert.
- Private content in telemetry -> do not include memory content, decision text, prompt text,
  or embeddings in Sentry/PostHog payloads; use IDs, counts, timings, provider names, and
  statuses only.
- Provider network in tests -> inject embeddings and analysis providers everywhere tests
  exercise the graph, repository, or routes.

## Migration Plan

1. Add the checkpoint package and embeddings provider dependencies/configuration.
2. Add or repair the SQL migration for the long-term-memory table so the final migrated
   schema includes pgvector, the memory table, indexes, foreign keys, and the uniqueness
   constraint.
3. Add the checkpointer setup step to the local/CI database workflow.
4. Implement the embeddings wrapper, pgvector repository, deterministic formatter, and
   graph dependency wiring behind tests.
5. Roll out with memory recall disabled only by dependency injection if needed; analysis
   remains functional with the no-op memory fallback.

## Open Questions

- Confirm the exact production vector dimension for the selected Voyage `voyage-3` account
  configuration before finalizing the migration. If the model/provider changes, the vector
  column dimension and provider config must change together.
