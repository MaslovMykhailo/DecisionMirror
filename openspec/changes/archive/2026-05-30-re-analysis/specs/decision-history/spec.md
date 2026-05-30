## ADDED Requirements

### Requirement: Decision detail retry and re-analysis controls

The system SHALL render authenticated decision detail controls for retryable analyses and
fresh re-analysis. Retry controls MUST appear when the newest analysis is failed or stalled
processing. Re-analysis controls MUST append a new analysis version and MUST NOT hide the
newest ready result while the new version is processing.

#### Scenario: Failed analysis can be retried from detail

- **WHEN** an authenticated owner opens a decision detail whose newest analysis is `failed`
- **THEN** the detail view shows a retry control
- **AND** activating retry calls the authenticated retry action for that decision
- **AND** the visible newest analysis state moves to `processing` when retry succeeds

#### Scenario: Stalled processing analysis can be retried from detail

- **WHEN** an authenticated owner opens a decision detail whose newest analysis is
  `processing` and marked stalled
- **THEN** the detail view shows a stalled retryable state
- **AND** activating retry calls the authenticated retry action for that decision
- **AND** the visible stalled state clears when retry succeeds

#### Scenario: Re-analysis keeps existing ready result visible

- **WHEN** an authenticated owner starts re-analysis for a decision that has a ready result
- **THEN** the detail view calls the authenticated re-analysis action for that decision
- **AND** the visible newest analysis state becomes `processing` for the new version when
  the action succeeds
- **AND** the previous newest ready result remains visible until a newer ready result exists

### Requirement: Analysis version switcher

The system SHALL render an analysis version switcher in the decision detail view when more
than one ready analysis version exists. The current analysis displayed by default MUST be
the newest `ready` version, and selecting an older ready version MUST only change the
rendered analysis result, not the newest analysis status or polling state.

#### Scenario: Newest ready version is selected by default

- **WHEN** an authenticated owner opens a decision detail with multiple ready analyses
- **THEN** the version switcher lists ready versions in descending version order
- **AND** the displayed analysis result defaults to the newest ready version

#### Scenario: Owner selects an older ready version

- **WHEN** an authenticated owner selects an older ready version from the switcher
- **THEN** the detail view renders that version's category, biases, missed alternatives,
  premortem risks, key assumptions, and warning signs
- **AND** the newest analysis status badge continues to represent the newest analysis row

#### Scenario: Version switcher omits non-ready versions

- **WHEN** a decision has failed or processing analysis versions
- **THEN** the version switcher does not offer those versions as completed results
- **AND** the newest analysis status still communicates failed, processing, or stalled state
  separately from the selected ready result

## MODIFIED Requirements

### Requirement: Authenticated decision detail

The system SHALL provide an authenticated decision detail view scoped to the session user.
The detail view MUST show the original submitted `situation`, `decision`, and optional
`reasoning` alongside analysis state, the newest ready structured analysis result when
available, and all ready analysis versions needed for version switching.

#### Scenario: Owner sees original input and ready analysis

- **WHEN** an authenticated user opens the detail view for one of their decisions with a
  ready analysis
- **THEN** the view shows the original submitted situation, decision, and optional reasoning
- **AND** the view shows the ready analysis category, biases, missed alternatives,
  premortem risks, key assumptions, and warning signs
- **AND** the current displayed analysis is the newest ready version

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
- **AND** the detail view offers retry for the failed analysis

### Requirement: Client status polling with backoff

The system SHALL poll analysis status from the client while any visible decision analysis
has newest status `processing` and is not stalled. Polling MUST use backoff, update visible
status state from the authenticated status endpoint, and stop for each decision once its
newest status is `ready`, `failed`, or stalled retryable.

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

- **WHEN** a polling response reports status `processing` and `isStalled = false`
- **THEN** the next poll for that decision is delayed using backoff
- **AND** the delay remains capped
- **WHEN** a polling response reports status `ready` or `failed`
- **THEN** polling stops for that decision

#### Scenario: Polling stops when processing becomes stalled

- **WHEN** a polling response reports status `processing` and `isStalled = true`
- **THEN** polling stops for that decision
- **AND** the visible state is updated to show retryable stalled processing

#### Scenario: Ready transition refreshes displayed analysis data

- **WHEN** a visible decision transitions from `processing` to `ready` during polling
- **THEN** the client updates the visible status badge
- **AND** the view refreshes its server-rendered data or otherwise loads the ready analysis
  result without requiring the user to manually reload

### Requirement: Decision history state rendering

The system SHALL render explicit state explanations for decision history and detail views
when analysis output is unavailable, still processing, stalled, failed, or absent. These
states MUST not expose raw private decision text through telemetry payloads.

#### Scenario: Not-ready state explains missing analysis

- **WHEN** a decision has no ready analysis result to display
- **THEN** the list or detail view explains that the analysis is not ready yet
- **AND** the view does not render empty result sections as if they were completed analysis

#### Scenario: Stalled state explains retryable processing

- **WHEN** the newest analysis for a decision is `processing` and marked stalled
- **THEN** the list or detail view shows a retryable stalled state
- **AND** the detail view provides retry without exposing raw decision content in telemetry

#### Scenario: Failed state explains retryable failure

- **WHEN** the newest analysis for a decision is failed
- **THEN** the list or detail view shows a failed status
- **AND** the detail view includes a user-facing explanation based on the stored failure
  reason when one exists
- **AND** the detail view provides retry for the failed analysis

#### Scenario: Telemetry omits decision content

- **WHEN** status polling, list rendering, detail rendering, retry, or re-analysis emits
  telemetry
- **THEN** telemetry payloads include only non-sensitive values such as IDs, enums, counts,
  and durations
- **AND** telemetry payloads do not include raw situation, decision, reasoning, or analysis
  prose
