# decision-capture Specification

## Purpose
Define how authenticated users capture private decision input, share create-decision validation across client and server, persist owned decisions with an initial processing analysis, and schedule analysis without blocking the create response.
## Requirements
### Requirement: Authenticated decision capture form

The system SHALL provide an authenticated create-decision form that captures a user's
private decision input with fields for `situation`, `decision`, and optional `reasoning`.
The form MUST validate required fields before submission using the same Zod contract used
by the server.

#### Scenario: Required fields are missing

- **WHEN** an authenticated user submits the create-decision form with an empty
  `situation` or empty `decision`
- **THEN** the form rejects the submission with field-level validation feedback
- **AND** no create request is sent to the server

#### Scenario: Optional reasoning is omitted

- **WHEN** an authenticated user submits valid `situation` and `decision` values without
  `reasoning`
- **THEN** the form submits successfully
- **AND** the payload does not require a reasoning value

#### Scenario: Captured input is trimmed

- **WHEN** an authenticated user submits `situation`, `decision`, or `reasoning` with
  leading or trailing whitespace
- **THEN** validation treats the trimmed values as the submitted input
- **AND** blank trimmed required fields are rejected

### Requirement: Shared create-decision validation contract

The system SHALL define one Zod schema for create-decision input and reuse it for both
client-side form validation and server-side request validation.

#### Scenario: Server rejects invalid payload

- **WHEN** an authenticated request submits a create-decision payload that violates the
  shared schema
- **THEN** the server rejects the request with field-level validation errors
- **AND** no `Decision` or `Analysis` row is created

#### Scenario: Client and server use the same validation rules

- **WHEN** a validation rule for create-decision input changes
- **THEN** both client-side validation and server-side validation consume that rule from
  the shared schema module

### Requirement: Decision creation persists initial processing analysis

The system SHALL create a `Decision` row and a version-1 `Analysis` row with
`status = processing` when an authenticated user submits valid create-decision input. The
created `Decision` MUST be owned by the session-derived `userId`, and the server MUST
ignore any client-supplied owner identifiers.

#### Scenario: Valid decision is persisted

- **WHEN** an authenticated user submits valid create-decision input
- **THEN** the system creates a `Decision` row containing the trimmed input
- **AND** the `Decision` row is owned by the authenticated session user's `userId`
- **AND** the system creates an `Analysis` row for that decision with `version = 1` and
  `status = processing`

#### Scenario: Client owner identifiers are ignored

- **WHEN** an authenticated create-decision request includes `userId`, `ownerId`, or another
  client-supplied owner identifier
- **THEN** the system stores ownership from the authenticated session only
- **AND** the client-supplied owner identifier does not affect the created rows

#### Scenario: Unauthenticated create request is denied

- **WHEN** an unauthenticated visitor submits a create-decision request
- **THEN** the system denies the request
- **AND** no `Decision` or `Analysis` row is created

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

