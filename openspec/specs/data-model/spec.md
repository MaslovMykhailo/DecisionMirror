# data-model Specification

## Purpose

Defines the persistence model for Decision Mirror: a Prisma relational schema of user-owned
decisions and append-only analysis versions, a pgvector long-term-memory table, and the
local/migratable database provisioning that brings it all up from a clean state.
## Requirements
### Requirement: Relational schema with user-owned decisions and analyses

The system SHALL define, via Prisma, the relational models `User`, `Account`, `Session`,
`Decision`, and `Analysis`. A `User` SHALL own many `Decision` rows, and a `Decision`
SHALL own many `Analysis` rows. `Account` and `Session` SHALL support the authentication
adapter. Every `Decision` SHALL carry a non-nullable foreign key to its owning `User` so
that all decision and analysis access can be scoped by `userId`.

#### Scenario: Decision is owned by exactly one user

- **WHEN** a `Decision` row is created
- **THEN** it references exactly one `User` via a required `userId` foreign key
- **AND** deleting the `User` cascades to that user's `Decision` and `Analysis` rows

#### Scenario: Analysis belongs to a decision

- **WHEN** an `Analysis` row is created
- **THEN** it references exactly one `Decision`
- **AND** the analysis is reachable only through its owning decision (and thereby its user)

### Requirement: Append-only analysis versions with a status lifecycle

The `Analysis` model SHALL be append-only: each re-analysis creates a new versioned row
rather than mutating an existing one, and each row SHALL carry a monotonically increasing
`version` per decision. Each `Analysis` SHALL have a `status` of `processing`, `ready`, or
`failed`, represented as a database enum. A failed analysis SHALL be able to record a
human-readable failure reason. Each `Analysis` SHALL carry the locale selected for that
analysis run so generated prose can be reproduced in the intended language. The "current"
analysis for a decision is the newest `ready` version.

#### Scenario: Status enum constrains allowed values

- **WHEN** an `Analysis` is persisted
- **THEN** its `status` is one of `processing`, `ready`, or `failed`
- **AND** any other value is rejected at the database boundary

#### Scenario: Re-analysis appends a new version

- **WHEN** a decision that already has analyses is re-analyzed
- **THEN** a new `Analysis` row is inserted with an incremented `version`
- **AND** prior analysis rows for that decision remain unchanged

#### Scenario: Failure reason is recordable

- **WHEN** an analysis is persisted with `status = failed`
- **THEN** a human-readable failure reason can be stored on that row

#### Scenario: Analysis records its run locale

- **WHEN** an analysis row is created
- **THEN** it stores the supported locale selected for that analysis run
- **AND** retrying that row preserves the same locale for provider execution

### Requirement: pgvector long-term-memory table

The system SHALL enable the `pgvector` extension on the same PostgreSQL instance and create
a long-term-memory table, via SQL migration, that stores per-decision embedding vectors
scoped by `userId` for later semantic recall. The memory table MUST store the owning
`userId`, `decisionId`, source `analysisId`, memory content, embedding vector, and
timestamps; it MUST constrain memory to one current record per `userId` and `decisionId`.
The relational schema (Prisma) and the vector table SHALL coexist on one instance.

#### Scenario: pgvector extension is available after migration

- **WHEN** the initial migrations are applied to a fresh database
- **THEN** the `pgvector` extension is enabled
- **AND** the long-term-memory table exists with a vector column and a `userId` column

#### Scenario: Memory records are user-scoped

- **WHEN** a memory record is written
- **THEN** it carries the owning `userId` so future similarity searches can be filtered to that user

#### Scenario: Memory records trace to ready analyses

- **WHEN** a ready analysis is remembered
- **THEN** the memory record stores the `decisionId` and source `analysisId`
- **AND** deleting the owning user or decision removes the memory record

#### Scenario: Memory record is current per decision

- **WHEN** a decision is remembered again after retry or re-analysis
- **THEN** the existing memory row for that `userId` and `decisionId` is updated
- **AND** similarity recall uses only the current memory content and embedding for that decision

### Requirement: Local and migratable database provisioning

The system SHALL provide a local PostgreSQL (with pgvector) via `docker compose` and a
migration workflow such that a contributor can bring up the database and apply all
migrations from a clean state. `DATABASE_URL` SHALL be the single connection configuration.

#### Scenario: Fresh database reaches the current schema

- **WHEN** a contributor runs `docker compose up -d` and the project's migrate command against an empty database
- **THEN** all relational tables, the status enum, and the pgvector memory table are created without error

### Requirement: Structured analysis result storage

The `Analysis` model SHALL be able to persist the structured sections produced by the agent
output contract: biases with explanations, missed alternatives, premortem risks, key
assumptions, and warning signs. These fields MUST support existing processing rows and
failed rows that do not have a ready result yet.

#### Scenario: Ready analysis stores structured sections

- **WHEN** a valid agent output is persisted as a ready analysis
- **THEN** the analysis row stores the category and every structured result section from the
  parsed output
- **AND** the stored category remains constrained by the database category enum

#### Scenario: Failed analysis can omit structured result

- **WHEN** an analysis is persisted with `status = failed`
- **THEN** the analysis row can store a human-readable failure reason without storing ready
  structured result sections

#### Scenario: Existing processing analyses remain migratable

- **WHEN** the structured result storage migration is applied to a database with existing
  processing analyses
- **THEN** the migration succeeds without requiring immediate structured result values for
  those rows
