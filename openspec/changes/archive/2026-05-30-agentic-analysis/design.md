## Context

Decision creation already persists a user-owned `Decision` plus a version-1
`Analysis(status=processing)` row and registers a background callback through `after()`.
The current route does not yet provide the real `runAgent(decisionId)` trigger, the
`agent/` tree has no implementation, and the Prisma `Analysis` model only stores status,
category, and failure reason.

The architecture requires a contract-first in-process LangGraph.js agent. This adjustment
uses the TypeScript LangChain OpenAI integration, `@langchain/openai`, which is the JS
counterpart to the Python `langchain-openai` package. Tests must mock the LLM provider and
start at the Zod output schema. Provider keys remain server-side, Sentry/PostHog telemetry
must carry IDs, enums, counts, durations, and reason classes only, never raw decision text,
and LangSmith traces must be scoped to an approved team project because model traces can
contain private decision content.

## Goals / Non-Goals

**Goals:**

- Define one strict `agent/schema.ts` output contract that imports the canonical category
  and bias taxonomies instead of redeclaring them.
- Add an injectable LangChain OpenAI provider wrapper that returns structured data and can
  be fully stubbed in tests.
- Use LangChain's ready-made structured-output and LangSmith tracing support instead of
  hand-coding direct OpenAI SDK response-format and tracing behavior.
- Build a typed LangGraph.js `StateGraph` behind `runAgent(decisionId)` with deterministic
  routing from validation success/failure to ready/failed persistence.
- Persist structured analysis sections and expose the current analysis status through an
  authenticated, user-scoped polling endpoint.
- Keep decision submission non-blocking while making the scheduled callback invoke the real
  agent entrypoint.

**Non-Goals:**

- Real pgvector recall and embedding writes are not completed here. The `load-memory` and
  `remember` seams use an injectable memory adapter that can no-op until the memory change
  lands.
- Retry, re-analysis, history/detail rendering, dashboard aggregation, and agent evals are
  outside this change except where their contracts are preserved.
- Tests must not call a real OpenAI model through LangChain; quality evals remain separate
  from the gate.

## Decisions

### Schema Owns the Boundary

`agent/schema.ts` defines `analysisOutputSchema` and exported TypeScript types. It composes
`categorySchema` and `biasSchema` from `@/lib/taxonomy`, then defines bounded arrays for:
`biases` with `{ id, explanation }`, `missedAlternatives`, `premortemRisks`,
`keyAssumptions`, and `warningSigns`. Free-form strings are non-empty and trimmed; IDs are
language-neutral while explanations are generated in the requested locale.

Alternative considered: accept provider JSON and validate only after persistence. That
would let invalid model output cross the application boundary and make failed analysis a
database cleanup problem rather than a handled state.

### Provider Wrapper Uses LangChain OpenAI

The provider module exposes a small interface, for example `analyzeDecision(input)`, and is
the only place that imports `@langchain/openai`. It constructs a server-only `ChatOpenAI`
instance from environment-driven model and API-key configuration, then derives a structured
model with `withStructuredOutput(analysisOutputSchema, { name: "decision_analysis",
method: "jsonSchema", strict: true })`. The wrapper still returns an unknown payload for
the graph `validate` node to parse with the local Zod contract, so local validation remains
the application boundary even though LangChain also validates Zod structured output.

OpenAI prompt caching is automatic for repeated prompt prefixes, so prompt construction
puts stable instructions and taxonomy lists before dynamic decision content. The LangChain
wrapper should preserve that message order and avoid putting user decision content in any
static prefix. It should not depend on direct SDK-only request syntax such as
`prompt_cache_key`; if a future LangChain version exposes a supported cache-key option, keep
that detail inside the wrapper.

Alternative considered: call OpenAI directly inside the graph node. Keeping a wrapper
makes provider behavior mockable and keeps LangChain/OpenAI-specific structured-output or
prompt-cache syntax out of graph tests.

Alternative considered: keep the raw OpenAI SDK wrapper and wrap it with LangSmith's
OpenAI tracing helper. LangChain's `ChatOpenAI` already gives the application structured
output and trace integration through one provider abstraction, so the raw SDK path adds
surface area without improving the contract.

### LangSmith Observability Is Environment-Gated

LangChain emits LangSmith traces when `LANGSMITH_TRACING=true` and `LANGSMITH_API_KEY` are
configured, with optional `LANGSMITH_PROJECT` and `LANGSMITH_WORKSPACE_ID` for project and
workspace scoping. The provider should pass `runName`, tags, and metadata through
LangChain runnable config, using non-sensitive identifiers such as analysis version,
decision ID, locale, and environment. It must not duplicate prompts or decision text into
Sentry/PostHog telemetry.

Alternative considered: build a custom tracing layer around the graph. That would duplicate
LangChain/LangSmith behavior and increase privacy review surface. The graph can still add
non-sensitive Sentry/PostHog metrics separately.

### Prompt Templates Are Deterministic Inputs

Prompt construction lives under `agent/prompts/` and exports pure functions that accept the
decision fields, locale, and optional prior patterns. The static prefix enumerates the
allowed category and bias identifiers from the canonical taxonomy and instructs the model to
select only from those identifiers. Locale affects prose fields only; category and bias IDs
remain stable.

Alternative considered: localize taxonomy identifiers in the prompt. That would make
filters and aggregation language-dependent and conflict with the existing internationalization
contract.

### Graph State Is Typed and Narrow

The graph uses LangGraph.js `Annotation.Root`/`StateGraph` state with fields such as
`decisionId`, `userId`, `locale`, `decisionInput`, `priorPatterns`, `rawOutput`,
`validatedOutput`, and `failureReason`. Nodes return partial state updates:

- `load-memory`: loads the decision by `decisionId` scoped through its owning `userId`, then
  asks the memory adapter for prior patterns; it returns an empty list when no adapter data
  exists.
- `analyze`: builds the prompt and invokes the provider wrapper.
- `validate`: runs `analysisOutputSchema.safeParse(rawOutput)` and sets either
  `validatedOutput` or a human-readable `failureReason`.
- `persist+remember`: updates the latest processing analysis to `ready`, stores structured
  fields, and calls the memory adapter.
- `fail`: updates the latest processing analysis to `failed` with the reason.

Conditional edges route from `validate` to `persist+remember` on valid output and to `fail`
on invalid output. Unhandled node errors are caught by `runAgent(decisionId)` and persisted
through the same fail path where possible.

Alternative considered: implement the pipeline as plain async functions first and wrap it in
LangGraph later. The graph is part of the architectural boundary and gives the future memory
and checkpointer work a stable seam.

### Structured Sections Use JSON Fields

`Analysis.category` remains a database enum for efficient filtering. Variable-length result
sections are stored as nullable JSON fields on `Analysis`:
`biases`, `missedAlternatives`, `premortemRisks`, `keyAssumptions`, and `warningSigns`.
Application code enforces that `ready` analyses have a parsed result and failed analyses
have a failure reason.

Alternative considered: create child tables for every section. That adds query and migration
overhead before there is evidence that individual section items need relational joins.

### Polling Endpoint Returns Status Without Private Text

`GET /api/decisions/[decisionId]/status` authenticates the session, scopes lookup through
`Decision.userId`, and returns the newest analysis metadata needed by polling:
`analysisId`, `version`, `status`, `updatedAt`, and `failureReason` when failed. It does not
return the raw decision text. Ready structured output can remain in the detail endpoint; if
the polling client needs a refresh signal, status metadata is enough.

Alternative considered: expose analysis status through the existing decision detail route.
The smaller endpoint gives polling a low-cost response and a clearer privacy surface.

## Risks / Trade-offs

- Provider structured-output behavior changes across LangChain/OpenAI versions -> Keep
  provider-specific parsing inside the wrapper and validate with local Zod before
  persistence.
- LangSmith traces can include raw prompt and decision content -> Gate tracing through
  LangSmith environment variables, use a team-scoped project, and keep other telemetry
  content-free.
- Prompt caching is easy to defeat with dynamic content -> Keep only stable instructions and
  taxonomy lists in the cacheable system prefix.
- Background execution can terminate early on serverless -> Persist failures when caught and
  leave retry/stalled-analysis handling to the retry change.
- JSON fields are less relational than child tables -> Accept this for the first structured
  result contract; category and bias IDs still remain validated and aggregation can evolve
  later.
- Memory is not fully implemented yet -> Keep `load-memory` and `remember` adapters
  injectable and no-op by default so this graph can ship independently.

## Migration Plan

1. Add nullable JSON columns for the structured analysis sections to `Analysis`.
2. Generate Prisma client artifacts after migration.
3. Deploy code that writes new fields only after the migration is available.
4. Rollback is additive: older code can ignore the nullable columns; failed/processing
   statuses remain compatible.

## Open Questions

- Confirm the exact OpenAI model default for the demo environment when implementation
  starts.
- Confirm the LangSmith project/workspace naming convention for development, preview, and
  production traces.
- Decide whether the status endpoint should include ready structured output immediately or
  only return status metadata and let the detail view refetch separately.
