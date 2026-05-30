## ADDED Requirements

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

## MODIFIED Requirements

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
