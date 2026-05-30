## 1. Test-First Contracts

- [x] 1.1 Add failing unit tests for the server-only embeddings interface, including Voyage default selection, OpenAI provider swapping, credential boundary, and deterministic test stubs
- [x] 1.2 Add failing unit tests for deterministic memory document and prior-pattern formatting, including bounded output and current-decision exclusion inputs
- [x] 1.3 Add failing integration tests for the pgvector memory repository covering empty recall, top-k ordering, one-row-per-decision upsert, and vector dimension rejection
- [x] 1.4 Add failing integration coverage proving cross-user memory records are never returned even when vectors are identical or near-identical
- [x] 1.5 Add failing graph tests for ready-only remember behavior and checkpointer invocation with an analysis-scoped thread id

## 2. Data Store And Dependencies

- [x] 2.1 Add the LangGraph PostgreSQL checkpointer package and embeddings provider dependencies/configuration
- [x] 2.2 Add or repair the SQL migration so the final migrated schema includes pgvector and a `DecisionMemory` table with `userId`, `decisionId`, `analysisId`, `content`, `embedding`, timestamps, foreign keys, indexes, and unique `(userId, decisionId)`
- [x] 2.3 Add the checkpointer setup step to the local and CI database workflow so LangGraph checkpoint tables are present before production-style runs
- [x] 2.4 Update `.env.example` and setup docs for embeddings provider selection, Voyage/OpenAI embedding keys, model names, and memory top-k configuration

## 3. Embeddings And Memory Repository

- [x] 3.1 Implement the embeddings wrapper with Voyage `voyage-3` as the default and OpenAI as an interchangeable provider behind the same interface
- [x] 3.2 Implement deterministic memory document construction from decision input plus validated analysis output
- [x] 3.3 Implement pgvector recall with `userId` filtering, current `decisionId` exclusion, top-k ordering by vector distance, and empty-result no-op behavior
- [x] 3.4 Implement pgvector remember as an idempotent upsert scoped by `userId` and `decisionId`, storing the source `analysisId`
- [x] 3.5 Ensure all repository and embeddings tests run without real provider or network calls

## 4. Agent Graph Wiring

- [x] 4.1 Extend `AgentMemory` inputs so `load-memory` passes loaded decision text to recall and `persist+remember` passes `analysisId` plus decision text to remember
- [x] 4.2 Wire the production `load-memory` node to embed the new decision, run user-scoped pgvector recall, and pass prior-pattern context into the analysis provider
- [x] 4.3 Wire the production `persist+remember` step to remember only after a `ready` result and never after validation/provider failure
- [x] 4.4 Wire LangGraph `PostgresSaver` into normal `runAgent(decisionId)` execution with a stable per-analysis `thread_id`
- [x] 4.5 Preserve dependency injection so unit, integration, and e2e tests can use no-op or stubbed memory, embeddings, provider, and checkpointer dependencies

## 5. Verification

- [x] 5.1 Run the targeted unit and integration tests for agent memory, graph branching, and data-model migration behavior
- [x] 5.2 Run `pnpm lint`, `pnpm typecheck`, and `pnpm test`
- [x] 5.3 Run `pnpm test:integration` against PostgreSQL with pgvector enabled
- [x] 5.4 Confirm no Sentry/PostHog telemetry payload includes raw decision text, memory content, prompt text, or embeddings
- [x] 5.5 Confirm the requested scope is covered: embeddings wrapper, `load-memory` recall, `remember` storage, `PostgresSaver` checkpointing, and cross-user isolation
