## ADDED Requirements

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
human-readable failure reason. The "current" analysis for a decision is the newest `ready`
version.

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

### Requirement: pgvector long-term-memory table

The system SHALL enable the `pgvector` extension on the same PostgreSQL instance and create
a long-term-memory table, via SQL migration, that stores per-decision embedding vectors
scoped by `userId` for later semantic recall. The relational schema (Prisma) and the vector
table SHALL coexist on one instance.

#### Scenario: pgvector extension is available after migration

- **WHEN** the initial migrations are applied to a fresh database
- **THEN** the `pgvector` extension is enabled
- **AND** the long-term-memory table exists with a vector column and a `userId` column

#### Scenario: Memory records are user-scoped

- **WHEN** a memory record is written
- **THEN** it carries the owning `userId` so future similarity searches can be filtered to that user

### Requirement: Local and migratable database provisioning

The system SHALL provide a local PostgreSQL (with pgvector) via `docker compose` and a
migration workflow such that a contributor can bring up the database and apply all
migrations from a clean state. `DATABASE_URL` SHALL be the single connection configuration.

#### Scenario: Fresh database reaches the current schema

- **WHEN** a contributor runs `docker compose up -d` and the project's migrate command against an empty database
- **THEN** all relational tables, the status enum, and the pgvector memory table are created without error
