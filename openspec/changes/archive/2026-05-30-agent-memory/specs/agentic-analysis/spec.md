## MODIFIED Requirements

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
