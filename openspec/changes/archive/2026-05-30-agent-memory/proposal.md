## Why

Decision Mirror already has an agent pipeline shape that anticipates memory, but the memory
slice needs a concrete implementation contract before work starts. Adding scoped semantic
recall lets each analysis reflect a user's recurring decision patterns without exposing one
user's private decision content to another.

## What Changes

- Add a shared embeddings interface with Voyage `voyage-3` as the default provider and an
  OpenAI embeddings provider available behind the same interface.
- Implement long-term memory recall in the `load-memory` graph node by embedding the current
  decision and retrieving top-k similar memories from pgvector, always filtered by `userId`.
- Summarize retrieved matches into compact "prior patterns" context for the analysis prompt,
  while treating an empty memory set as a no-op.
- Persist a new long-term-memory record after a validated `ready` analysis so future runs can
  recall it.
- Wire LangGraph's `PostgresSaver` checkpointer so retry/resume can continue graph runs
  without relying only on in-memory state.
- Add deterministic tests for empty recall, top-k recall, memory writes, checkpointer wiring,
  and cross-user isolation.

## Capabilities

### New Capabilities

- `agent-memory`: Long-term per-user semantic recall and graph checkpointing for the
  agentic analysis pipeline.

### Modified Capabilities

- `agentic-analysis`: The existing graph requirements are tightened to require scoped memory
  recall before analysis, remember-after-ready behavior, and checkpointer-backed retry/resume.
- `data-model`: The existing pgvector memory requirement is tightened to define the stored
  fields and query constraints needed by recall and remember.

## Impact

- Affected code: `agent/` graph nodes, embeddings provider wrapper, prompt-context builder,
  memory repository/raw SQL helpers, and `runAgent(decisionId)` graph compilation.
- Affected database systems: pgvector memory table usage and LangGraph `PostgresSaver`
  checkpoint tables on the existing PostgreSQL instance.
- Affected configuration: embeddings provider selection and API keys in environment
  configuration.
- Affected tests: unit tests for deterministic memory formatting/provider interfaces and
  integration tests against PostgreSQL + pgvector with mocked embeddings and mocked LLM
  provider.
