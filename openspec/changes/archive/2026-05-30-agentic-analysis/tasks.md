## 1. Output Contract

- [x] 1.1 Add failing unit tests for `agent/schema.ts` that accept a valid structured analysis payload.
- [x] 1.2 Add failing unit tests that reject unknown category values, unknown bias values, missing required sections, empty prose strings, and extra fields.
- [x] 1.3 Implement `agent/schema.ts` with strict Zod schemas composed from `@/lib/taxonomy`.
- [x] 1.4 Add reusable valid and invalid canned analysis fixtures for agent tests.

## 2. Persistence Model

- [x] 2.1 Add a failing data-model or integration test proving a ready `Analysis` can store biases, missed alternatives, premortem risks, key assumptions, and warning signs.
- [x] 2.2 Add a failing test proving failed analyses can store `failureReason` without structured result fields.
- [x] 2.3 Add nullable JSON result fields to the Prisma `Analysis` model and create the migration.
- [x] 2.4 Regenerate Prisma client artifacts and update any typed test doubles for the new fields.

## 3. Prompts and LangChain OpenAI Provider

- [x] 3.1 Add `@langchain/openai`, `@langchain/core`, and `@langchain/langgraph` runtime dependencies if they are not already installed, and remove the direct `openai` app dependency if no other code uses it.
- [x] 3.2 Add failing prompt-template tests proving prompts list canonical taxonomy identifiers, preserve language-neutral IDs, include locale instructions, and include prior patterns when provided.
- [x] 3.3 Implement locale-aware prompt builders under `agent/prompts/`.
- [x] 3.4 Add failing provider-wrapper tests with a fake LangChain chat model proving `withStructuredOutput` receives `analysisOutputSchema`, JSON-schema/strict options are requested, the static prefix precedes dynamic decision content, decision content is not part of the static prefix, locale reaches the prompt, and LangSmith-safe run config metadata is passed.
- [x] 3.5 Implement the server-only LangChain OpenAI provider wrapper with `ChatOpenAI`, environment-driven model/API-key configuration, structured-output invocation, LangSmith tracing config, and test injection.

## 4. LangGraph Agent Pipeline

- [x] 4.1 Add failing node tests for loading the decision plus latest processing analysis, including the no-provider-call behavior when no processing analysis exists.
- [x] 4.2 Add failing validation-node tests for valid output, invalid output, and human-readable failure reasons.
- [x] 4.3 Add failing graph tests for ready persistence, invalid-output failure persistence, and provider-error failure persistence with the provider mocked.
- [x] 4.4 Implement typed graph state, `load-memory`, `analyze`, `validate`, `persist+remember`, and `fail` nodes with injectable provider and memory adapters.
- [x] 4.5 Compile the LangGraph.js `StateGraph` behind `runAgent(decisionId)` and catch unhandled node errors into the failed-analysis path where possible.

## 5. API Integration

- [x] 5.1 Add a failing route test proving successful decision creation schedules the real `runAgent(decisionId)` through the existing `after()` seam without delaying the response.
- [x] 5.2 Wire `app/api/decisions/route.ts` to pass `runAgent` as the scheduled analysis trigger.
- [x] 5.3 Add failing status endpoint tests for authenticated owner access, unauthenticated denial, cross-user denial, and failed-analysis `failureReason` shape.
- [x] 5.4 Implement the user-scoped status service and `GET /api/decisions/[decisionId]/status` route.

## 6. Verification

- [x] 6.1 Confirm all agent, persistence, route, and prompt tests use stubs/mocks and do not call a real model through LangChain.
- [x] 6.2 Update `.env.example` or setup docs for required OpenAI and LangSmith variables if missing.
- [x] 6.3 Run `pnpm lint`, `pnpm typecheck`, and `pnpm test`.
