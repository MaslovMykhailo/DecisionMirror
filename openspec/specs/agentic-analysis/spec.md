# agentic-analysis Specification

## Purpose
Defines the server-side agentic analysis contract, provider integration, prompt behavior,
graph execution, persistence outcomes, and authenticated status polling for structured
decision analysis.
## Requirements
### Requirement: Strict agent output contract

The system SHALL define a strict Zod output contract in `agent/schema.ts` for agentic
analysis results. The contract MUST compose the canonical decision-category and
cognitive-bias schemas from the domain taxonomy, and MUST include `category`, `biases`
with explanations, `missedAlternatives`, `premortemRisks`, `keyAssumptions`, and
`warningSigns`.

#### Scenario: Valid structured analysis parses

- **WHEN** a payload includes a canonical category, canonical bias identifiers with
  non-empty explanations, and non-empty strings for each structured section
- **THEN** `agent/schema.ts` accepts the payload
- **AND** the parsed result exposes typed values for persistence and rendering

#### Scenario: Unknown category or bias is rejected

- **WHEN** a payload includes a category or bias identifier outside the canonical taxonomy
- **THEN** the output contract rejects the payload
- **AND** no ready analysis result is persisted from that payload

#### Scenario: Extra fields are rejected

- **WHEN** a payload includes fields not defined by the output contract
- **THEN** the output contract rejects the payload
- **AND** the validation failure is handled as a failed analysis state

### Requirement: LangChain OpenAI structured analysis provider

The system SHALL provide a server-only LangChain OpenAI provider wrapper for agentic
analysis. The wrapper MUST use `@langchain/openai` `ChatOpenAI` structured output matching
the local analysis contract, MUST preserve prompt-cache-friendly static prefixes, MUST
accept locale as an input for free-form prose generation, and MUST expose LangSmith tracing
configuration through LangChain runnable config.

#### Scenario: Provider receives locale and decision input

- **WHEN** the analyze node invokes the provider wrapper
- **THEN** the wrapper receives the decision situation, chosen decision, optional reasoning,
  locale, and prior-pattern context
- **AND** the locale comes from the processing analysis row for the current run
- **AND** the provider request asks the model to produce free-form prose in that locale

#### Scenario: Static prefix is cacheable

- **WHEN** the provider builds a LangChain `ChatOpenAI` invocation
- **THEN** the static instruction prefix is placed before dynamic decision content so it is
  eligible for OpenAI prompt caching
- **AND** user decision content is not included in the cached static prefix

#### Scenario: Provider can be stubbed in tests

- **WHEN** unit or integration tests exercise the analysis graph
- **THEN** the LangChain OpenAI provider dependency can be replaced with a deterministic stub
- **AND** the tests do not call a real model or require network access

#### Scenario: Structured output uses local schema

- **WHEN** the provider creates the structured model
- **THEN** it passes `analysisOutputSchema` to LangChain structured output
- **AND** provider output is still parsed by the local Zod validation node before a ready
  analysis is persisted

#### Scenario: LangSmith tracing is opt-in and scoped

- **WHEN** LangSmith tracing environment variables are configured
- **THEN** the provider invocation includes non-sensitive run name, tags, and metadata
- **AND** Sentry/PostHog telemetry does not receive raw decision or prompt content

### Requirement: Locale-aware analysis prompts

The system SHALL define analysis prompt templates that instruct the model to select only
from the controlled category and cognitive-bias taxonomies while producing explanatory
text in the requested locale.

#### Scenario: Taxonomy identifiers remain language-neutral

- **WHEN** a prompt is built for any supported locale
- **THEN** the allowed category and bias options are represented by canonical identifiers
- **AND** localized prose requirements do not alter those identifiers

#### Scenario: Prompt includes prior patterns when available

- **WHEN** the load-memory node returns prior-pattern context
- **THEN** the analysis prompt includes that context for the model
- **AND** an empty prior-pattern result still produces a valid prompt

### Requirement: Agent graph runs behind runAgent

The system SHALL expose `runAgent(decisionId)` as the public entrypoint for agentic analysis.
It MUST compile or invoke an in-process LangGraph.js state graph with nodes
`load-memory -> analyze -> validate -> persist+remember` and a `fail` branch. In normal
runtime, the graph MUST use a PostgreSQL-backed LangGraph checkpointer with a stable
per-analysis thread identifier so interrupted processing analyses can resume on retry.

#### Scenario: Ready path persists validated output

- **WHEN** `runAgent(decisionId)` loads a user-owned processing analysis and the provider
  returns output that passes the Zod contract
- **THEN** the graph routes through `persist+remember`
- **AND** the latest processing analysis for that decision is updated to `status = ready`
  with the parsed structured result
- **AND** the ready result is passed to the memory layer for user-scoped remembering

#### Scenario: Invalid provider output routes to fail

- **WHEN** the provider returns output that fails the Zod contract
- **THEN** the validate node routes to the `fail` branch
- **AND** the latest processing analysis for that decision is updated to `status = failed`
  with a human-readable retryable reason
- **AND** no memory record is written for the failed result

#### Scenario: Missing decision does not leak data

- **WHEN** `runAgent(decisionId)` cannot find a matching decision and processing analysis
- **THEN** the graph does not call the provider
- **AND** the result does not expose another user's decision or analysis content

#### Scenario: Retry resumes checkpointed graph state

- **WHEN** `runAgent(decisionId)` is invoked again for the same processing analysis after an
  interrupted run
- **THEN** the graph invocation uses the same checkpointer thread identifier for that
  analysis
- **AND** LangGraph can resume from the persisted checkpoint at a node boundary

### Requirement: Authenticated analysis retry action

The system SHALL expose a server-side authenticated retry action for the newest retryable
analysis of an owned decision. A retryable analysis is either the newest `failed` analysis
or the newest `processing` analysis whose `updatedAt` is older than the configured stalled
analysis timeout. Retrying MUST preserve the analysis row, version, and locale; set
`status = processing`; clear `failureReason`; and re-trigger `runAgent(decisionId)`.

#### Scenario: Owner retries failed analysis

- **WHEN** an authenticated owner retries a decision whose newest analysis is `failed`
- **THEN** the same analysis row is updated to `status = processing`
- **AND** the analysis version and locale remain unchanged
- **AND** `failureReason` is cleared
- **AND** `runAgent(decisionId)` is scheduled for that decision

#### Scenario: Owner retries stalled processing analysis

- **WHEN** an authenticated owner retries a decision whose newest analysis is `processing`
  and older than the stalled analysis timeout
- **THEN** the same analysis row remains the active processing version
- **AND** `updatedAt` is refreshed by the retry update
- **AND** `runAgent(decisionId)` is scheduled for that decision

#### Scenario: Active processing analysis is not retried

- **WHEN** an authenticated owner retries a decision whose newest analysis is `processing`
  but not stalled
- **THEN** no analysis row is mutated
- **AND** `runAgent(decisionId)` is not scheduled again
- **AND** the action returns a state the UI can present as already processing

#### Scenario: Cross-user retry is denied

- **WHEN** an authenticated user retries a decision owned by another user
- **THEN** the retry action returns not found or denied
- **AND** no analysis row is mutated
- **AND** `runAgent(decisionId)` is not scheduled

### Requirement: Authenticated re-analysis action

The system SHALL expose a server-side authenticated re-analysis action for owned decisions.
Re-analysis MUST append a new `Analysis` row with the next monotonically increasing
`version`, set the row to `processing`, store the locale selected for that run, and schedule
`runAgent(decisionId)` for the decision. Prior analysis rows MUST remain unchanged.

#### Scenario: Owner starts a new re-analysis version

- **WHEN** an authenticated owner starts re-analysis for a decision with existing analyses
- **THEN** a new `Analysis` row is inserted with `version = max(existing versions) + 1`
- **AND** the new row has `status = processing`
- **AND** prior ready, failed, and processing rows are not overwritten
- **AND** `runAgent(decisionId)` is scheduled for that decision

#### Scenario: Re-analysis records selected locale

- **WHEN** an authenticated owner starts re-analysis from a localized UI
- **THEN** the new analysis row stores the locale selected for that run
- **AND** provider execution for that row uses the stored locale

#### Scenario: Active processing analysis blocks duplicate re-analysis

- **WHEN** an authenticated owner starts re-analysis while the newest analysis is
  `processing` and not stalled
- **THEN** no new analysis row is inserted
- **AND** `runAgent(decisionId)` is not scheduled again
- **AND** the action returns a state the UI can present as already processing

#### Scenario: Cross-user re-analysis is denied

- **WHEN** an authenticated user starts re-analysis for a decision owned by another user
- **THEN** the re-analysis action returns not found or denied
- **AND** no analysis row is inserted
- **AND** `runAgent(decisionId)` is not scheduled

### Requirement: Stalled processing analysis detection

The system SHALL determine stalled processing analyses by comparing the newest processing
analysis `updatedAt` timestamp with a configured timeout threshold. Stalled detection MUST
be deterministic in tests by allowing the current time and threshold to be controlled
without sleeping.

#### Scenario: Processing analysis past threshold is stalled

- **WHEN** a processing analysis `updatedAt` is older than the stalled analysis timeout
- **THEN** the system marks the analysis as stalled in returned status/read-model metadata
- **AND** the analysis remains stored with `status = processing`
- **AND** the analysis is marked retryable

#### Scenario: Recent processing analysis is active

- **WHEN** a processing analysis `updatedAt` is within the stalled analysis timeout
- **THEN** the system does not mark the analysis as stalled
- **AND** the analysis is not marked retryable

### Requirement: Analysis status polling endpoint

The system SHALL expose an authenticated status endpoint for client polling at
`GET /api/decisions/:id/status`. The endpoint MUST scope the decision lookup to the
authenticated session user's `userId` and return the newest analysis status for that
decision, including retryability metadata for failed and stalled analyses.

#### Scenario: Authenticated owner receives current status

- **WHEN** an authenticated user requests status for one of their decisions
- **THEN** the endpoint returns the current analysis `analysisId`, `version`, `status`, and
  `updatedAt`
- **AND** the response includes `isStalled` and `retryable` booleans
- **AND** the response includes `failureReason` only when the current analysis is failed

#### Scenario: Stalled processing status is retryable

- **WHEN** an authenticated user requests status for a decision whose newest analysis is
  `processing` and older than the stalled analysis timeout
- **THEN** the endpoint returns `status = processing`
- **AND** the endpoint returns `isStalled = true`
- **AND** the endpoint returns `retryable = true`

#### Scenario: Unauthenticated status request is denied

- **WHEN** an unauthenticated request asks for analysis status
- **THEN** the endpoint denies the request
- **AND** no private decision or analysis data is returned

#### Scenario: Cross-user status request is denied

- **WHEN** an authenticated user requests status for a decision owned by another user
- **THEN** the endpoint returns a not-found or denied response
- **AND** no private decision or analysis data from the other user is returned
