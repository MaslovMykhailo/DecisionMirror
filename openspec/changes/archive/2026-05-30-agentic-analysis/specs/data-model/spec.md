## ADDED Requirements

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
