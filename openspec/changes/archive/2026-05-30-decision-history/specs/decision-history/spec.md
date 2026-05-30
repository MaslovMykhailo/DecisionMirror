## ADDED Requirements

### Requirement: Authenticated decision list

The system SHALL provide an authenticated decision history list scoped to the session
user. Each listed decision MUST show a concise summary of the saved decision input, the
category from the newest ready analysis when available, and a badge representing the newest
analysis status.

#### Scenario: Owner sees only their decisions

- **WHEN** an authenticated user opens the decision history list
- **THEN** the system queries decisions owned by the authenticated session user's `userId`
- **AND** the list excludes decisions owned by any other user

#### Scenario: List row shows decision metadata

- **WHEN** a listed decision has at least one analysis
- **THEN** the row shows a concise summary of the original decision input
- **AND** the row shows the newest analysis status as a badge
- **AND** the row shows the newest ready analysis category when a ready analysis exists

#### Scenario: Processing row has no ready category

- **WHEN** a listed decision has only a `processing` analysis
- **THEN** the row shows a processing status badge
- **AND** the row does not present a completed category as if analysis were ready

#### Scenario: Empty history

- **WHEN** an authenticated user has no decisions
- **THEN** the decision history list renders an empty state
- **AND** the empty state does not show another user's decisions or analysis data

### Requirement: Authenticated decision detail

The system SHALL provide an authenticated decision detail view scoped to the session user.
The detail view MUST show the original submitted `situation`, `decision`, and optional
`reasoning` alongside analysis state and the newest ready structured analysis result when
available.

#### Scenario: Owner sees original input and ready analysis

- **WHEN** an authenticated user opens the detail view for one of their decisions with a
  ready analysis
- **THEN** the view shows the original submitted situation, decision, and optional reasoning
- **AND** the view shows the ready analysis category, biases, missed alternatives,
  premortem risks, key assumptions, and warning signs

#### Scenario: Cross-user detail read is denied

- **WHEN** an authenticated user opens the detail view for a decision owned by another user
- **THEN** the system denies the read or renders not found
- **AND** the response does not include the other user's original input or analysis content

#### Scenario: Detail shows processing state before ready output exists

- **WHEN** an authenticated user opens the detail view for a decision whose newest analysis
  is `processing` and no ready analysis exists
- **THEN** the view shows the original submitted input
- **AND** the analysis area explains that the analysis is not ready yet

#### Scenario: Detail preserves previous ready output during re-analysis

- **WHEN** an authenticated user opens the detail view for a decision with an older ready
  analysis and a newer `processing` analysis
- **THEN** the view shows the original submitted input
- **AND** the view shows the older ready analysis result as the current available result
- **AND** the view indicates that a newer analysis is still processing

#### Scenario: Detail shows failed state

- **WHEN** an authenticated user opens the detail view for a decision whose newest analysis
  is `failed`
- **THEN** the analysis area shows a failed state
- **AND** the failed state includes the stored failure reason when one exists

### Requirement: Client status polling with backoff

The system SHALL poll analysis status from the client while any visible decision analysis
has newest status `processing`. Polling MUST use backoff, update visible status state from
the authenticated status endpoint, and stop for each decision once its newest status is
`ready` or `failed`.

#### Scenario: Polling starts for processing list rows

- **WHEN** the history list renders one or more visible decisions with newest status
  `processing`
- **THEN** the client polls `GET /api/decisions/:id/status` for those decisions
- **AND** the client does not poll decisions whose newest status is already `ready` or
  `failed`

#### Scenario: Polling starts for processing detail

- **WHEN** the detail view renders a decision whose newest analysis status is `processing`
- **THEN** the client polls `GET /api/decisions/:id/status` for that decision
- **AND** the visible status updates from each successful polling response

#### Scenario: Polling backs off and stops when settled

- **WHEN** a polling response reports status `processing`
- **THEN** the next poll for that decision is delayed using backoff
- **AND** the delay remains capped
- **WHEN** a polling response reports status `ready` or `failed`
- **THEN** polling stops for that decision

#### Scenario: Ready transition refreshes displayed analysis data

- **WHEN** a visible decision transitions from `processing` to `ready` during polling
- **THEN** the client updates the visible status badge
- **AND** the view refreshes its server-rendered data or otherwise loads the ready analysis
  result without requiring the user to manually reload

### Requirement: Decision history state rendering

The system SHALL render explicit state explanations for decision history and detail views
when analysis output is unavailable, still processing, failed, or absent. These states MUST
not expose raw private decision text through telemetry payloads.

#### Scenario: Not-ready state explains missing analysis

- **WHEN** a decision has no ready analysis result to display
- **THEN** the list or detail view explains that the analysis is not ready yet
- **AND** the view does not render empty result sections as if they were completed analysis

#### Scenario: Failed state explains retryable failure

- **WHEN** the newest analysis for a decision is failed
- **THEN** the list or detail view shows a failed status
- **AND** the detail view includes a user-facing explanation based on the stored failure
  reason when one exists

#### Scenario: Telemetry omits decision content

- **WHEN** status polling, list rendering, or detail rendering emits telemetry
- **THEN** telemetry payloads include only non-sensitive values such as IDs, enums, counts,
  and durations
- **AND** telemetry payloads do not include raw situation, decision, reasoning, or analysis
  prose
