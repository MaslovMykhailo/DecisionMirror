# agent-memory Specification

## Purpose

Defines the server-only semantic memory layer for agentic analysis: embeddings provider
selection, user-scoped pgvector recall, ready-analysis remembering, and checkpointed
agent execution.

## Requirements

### Requirement: Server-only embeddings provider abstraction

The system SHALL provide a server-only embeddings wrapper for agent memory. The wrapper
MUST expose one interface for embedding recall queries and memory documents, MUST use
Voyage `voyage-3` as the default provider, MUST allow an OpenAI embeddings provider behind
the same interface, and MUST allow deterministic stubs in tests.

#### Scenario: Default embeddings provider is Voyage

- **WHEN** the production embeddings wrapper is constructed without an explicit provider override
- **THEN** it uses the Voyage provider with the `voyage-3` model
- **AND** the Voyage credential is read only in server-side code

#### Scenario: OpenAI provider uses the same interface

- **WHEN** configuration selects the OpenAI embeddings provider
- **THEN** the recall and remember code calls the same embeddings interface used for Voyage
- **AND** no memory graph node depends on provider-specific SDK types

#### Scenario: Embeddings are stubbed in tests

- **WHEN** unit, integration, or e2e tests exercise memory recall or remember behavior
- **THEN** the embeddings dependency can be replaced with deterministic vectors
- **AND** tests do not call a real embeddings provider or require network access

### Requirement: User-scoped semantic memory recall

The `load-memory` node SHALL embed the current decision input, run a pgvector top-k
similarity search for prior memory records, and return compact prior-pattern context for
the analysis prompt. The search MUST be scoped by the decision owner's `userId`, MUST
exclude memory for the current decision, and MUST degrade to an empty context when no
matching memories exist.

#### Scenario: Empty memory is a no-op

- **WHEN** analysis runs for a decision and the owning user has no eligible memory records
- **THEN** `load-memory` returns an empty prior-pattern context
- **AND** the graph continues to the `analyze` node

#### Scenario: Similar user memories become prior patterns

- **WHEN** analysis runs for a decision and the owning user has similar prior memory records
- **THEN** `load-memory` retrieves the configured top-k matches for that same `userId`
- **AND** it converts those matches into bounded prior-pattern strings for the provider input

#### Scenario: Current decision is excluded from recall

- **WHEN** a decision already has a stored memory record from an earlier ready analysis
- **THEN** recall for a new analysis of that same decision excludes that decision's own memory
- **AND** the analysis is not informed by a duplicate echo of itself

#### Scenario: Cross-user memory is never recalled

- **WHEN** another user has semantically similar memory records
- **THEN** those records are not eligible for recall
- **AND** no prior-pattern context contains another user's decision content

### Requirement: Ready analyses are remembered

The `persist+remember` path SHALL write or update a user-scoped memory record only after a
validated analysis has been persisted as `ready`. Remembering MUST embed the memory document
through the shared embeddings interface and MUST store enough metadata to trace the memory
to the decision and ready analysis that produced it.

#### Scenario: Ready analysis writes memory

- **WHEN** the graph persists a validated analysis as `ready`
- **THEN** the remember step embeds the memory document
- **AND** it stores a memory record with the owning `userId`, `decisionId`, and `analysisId`

#### Scenario: Failed analysis is not remembered

- **WHEN** provider output is invalid or the provider call fails
- **THEN** the graph records a failed analysis state
- **AND** no new or updated memory record is written for that failed result

#### Scenario: Remember is idempotent per decision

- **WHEN** the same decision is remembered more than once because of retry or re-analysis
- **THEN** the memory store updates the existing record for that `userId` and `decisionId`
- **AND** recall sees only the current memory record for that decision

### Requirement: Checkpointed agent execution

The normal `runAgent(decisionId)` execution path SHALL compile or invoke the LangGraph graph
with a PostgreSQL-backed checkpointer. Each processing analysis run MUST use a stable
per-analysis thread identifier so a retry can resume the same graph state at node
boundaries instead of depending only on in-memory execution.

#### Scenario: Production graph uses PostgresSaver

- **WHEN** `runAgent(decisionId)` runs with production dependencies
- **THEN** the graph is invoked with a PostgreSQL checkpointer
- **AND** the LangGraph runnable config includes a stable thread identifier for the
  processing analysis

#### Scenario: Retry uses the same analysis thread

- **WHEN** a retry re-runs an analysis that still has a processing analysis record
- **THEN** `runAgent(decisionId)` uses the same checkpointer thread identifier for that
  analysis
- **AND** LangGraph can resume from persisted checkpoint state

#### Scenario: Tests can bypass durable checkpointing

- **WHEN** tests exercise graph branching, validation, recall, or remember behavior
- **THEN** the checkpointer dependency can be omitted or replaced with an in-memory test
  implementation
- **AND** deterministic tests do not require a production database checkpointer
