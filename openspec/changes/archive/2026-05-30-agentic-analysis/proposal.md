## Why

Decision capture already creates `processing` analysis rows, but there is no implemented
agent contract or pipeline that can turn those rows into usable reflections. This change
adds the contract-first agentic analysis path so users can receive structured, validated,
locale-aware decision feedback without blocking submission.

## What Changes

- Add the strict `agent/schema.ts` Zod output contract for category, biases with
  explanations, missed alternatives, premortem risks, key assumptions, and warning signs.
- Add a LangChain OpenAI provider wrapper using `@langchain/openai` `ChatOpenAI`
  with structured output, prompt-cache-friendly static prefixes, and locale-aware prose.
- Configure LangSmith observability through LangChain tracing rather than bespoke provider
  instrumentation.
- Add locale-aware prompt templates that require selections from the canonical category and
  cognitive-bias taxonomies.
- Add the in-process LangGraph.js `StateGraph` behind `runAgent(decisionId)` with
  `load-memory -> analyze -> validate -> persist+remember`, plus an invalid/error `fail`
  branch.
- Persist valid structured results as `ready`; persist invalid or failed runs as `failed`
  with a human-readable retryable reason.
- Add the authenticated analysis-status query endpoint used by client polling.
- Wire successful decision creation to schedule the real `runAgent(decisionId)` callback
  through the existing non-blocking background seam.

## Capabilities

### New Capabilities

- `agentic-analysis`: Contract-first LLM analysis pipeline, provider wrapper, prompt
  templates, graph orchestration, validation/failure handling, persistence, and status
  polling.

### Modified Capabilities

- `decision-capture`: The existing background scheduling seam now invokes
  `runAgent(decisionId)` after a successful create while preserving the immediate response.
- `data-model`: Analysis rows must be able to store the structured agent output sections in
  addition to status, category, and failure reason.

## Impact

- Affected modules: `agent/`, `agent/schema.ts`, `agent/prompts/`, `agent/nodes/`,
  LangChain provider wrappers, and `runAgent(decisionId)`.
- Affected API: `POST /api/decisions` scheduling dependency and
  `GET /api/decisions/:id/status` polling endpoint.
- Affected persistence: Prisma `Analysis` model and migration for structured result fields.
- Affected tests: unit tests for the Zod contract and deterministic nodes, integration
  tests for ready/failed persistence and status polling, and route tests for non-blocking
  scheduling.
- New runtime dependencies are expected for `@langchain/openai`, `@langchain/core`, and
  LangGraph if not already installed. The direct `openai` SDK should not be an application
  dependency unless another feature requires it. Gate tests must mock provider calls and
  remain offline.
