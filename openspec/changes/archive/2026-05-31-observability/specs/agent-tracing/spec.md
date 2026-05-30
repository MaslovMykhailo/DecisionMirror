## ADDED Requirements

### Requirement: LangSmith tracing for runAgent

The system SHALL trace every `runAgent` invocation to LangSmith as a single run tree, with
each graph node (`load-memory`, `analyze`, `validate`, `persist+remember`, and the failure
path) appearing as a child span recording its inputs and outputs. Tracing MUST be controlled
by configuration (`LANGSMITH_TRACING` plus an API key) and MUST be inert when disabled or
unconfigured, so local and test runs neither call LangSmith nor error.

#### Scenario: Run produces a per-node trace

- **WHEN** `runAgent` executes with LangSmith tracing enabled
- **THEN** a run tree is recorded whose child spans correspond to the executed graph nodes
- **AND** each span records that node's inputs and outputs

#### Scenario: Disabled when not configured

- **WHEN** LangSmith tracing is disabled or no API key is configured
- **THEN** `runAgent` runs normally and emits no LangSmith traffic

### Requirement: Run metadata — tokens and recalled memories

The system SHALL attach run metadata to each traced `runAgent` execution that includes token
usage for the LLM call, latency, and the set of memories recalled during `load-memory`
(identified by reference, not raw content). This metadata MUST be sufficient to diagnose weak
output and irrelevant memory recall without exposing more decision content than the trace
inputs already require.

#### Scenario: Token usage recorded on the run

- **WHEN** the `analyze` node calls the LLM during a traced run
- **THEN** the run records the token usage for that call

#### Scenario: Recalled memories recorded as metadata

- **WHEN** `load-memory` recalls prior-decision memories during a traced run
- **THEN** the recalled memories are recorded in run metadata by reference
- **AND** the metadata enables identifying which memories were surfaced

### Requirement: Project scoping and retention

The system SHALL scope LangSmith traces to a configured project (`LANGSMITH_PROJECT`) and
SHALL apply a retention policy to that project. Tracing MUST be confined to interactive
application runs and kept out of shared or cron/headless contexts where the configured
project or key is absent.

#### Scenario: Traces land in the configured project

- **WHEN** a traced run executes with `LANGSMITH_PROJECT` configured
- **THEN** the run is recorded under that project

#### Scenario: Cron/headless context does not trace

- **WHEN** `runAgent` is invoked in a context where the LangSmith project or key is not provisioned
- **THEN** no trace is emitted to a shared project
