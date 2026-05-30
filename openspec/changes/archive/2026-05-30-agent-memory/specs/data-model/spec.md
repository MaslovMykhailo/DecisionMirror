## MODIFIED Requirements

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
