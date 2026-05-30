## MODIFIED Requirements

### Requirement: Decision submission does not block on analysis

The system SHALL return the create-decision response after persistence without waiting for
analysis work to complete. The route-level background scheduling seam MUST receive the
created `decisionId` after a successful create and MUST invoke `runAgent(decisionId)` inside
the scheduled callback.

#### Scenario: Successful create response is immediate

- **WHEN** an authenticated user submits valid create-decision input
- **THEN** the server returns a successful response containing the created `decisionId` and
  initial `analysisId`
- **AND** the response is not delayed by the duration of scheduled analysis work

#### Scenario: Background scheduling invokes runAgent

- **WHEN** a valid create-decision request succeeds
- **THEN** the route-level background scheduling seam is registered with the created
  `decisionId`
- **AND** the scheduled callback invokes `runAgent(decisionId)`
- **AND** the scheduled callback is independent from the persistence transaction

#### Scenario: Invalid create does not schedule analysis

- **WHEN** create-decision validation fails or authentication fails
- **THEN** the system does not schedule background analysis work
