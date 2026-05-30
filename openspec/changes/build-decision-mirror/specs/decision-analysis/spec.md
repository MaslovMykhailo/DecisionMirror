## ADDED Requirements

### Requirement: Structured LLM analysis output
The system SHALL send the decision's situation, decision, and optional reasoning to an LLM provider and SHALL produce a structured analysis containing: a decision category, a list of potential cognitive biases, a list of missed alternatives, a list of premortem risks, a list of key assumptions, and a list of early warning signs.

#### Scenario: Successful analysis
- **WHEN** the analysis work runs for a decision and the LLM returns output that conforms to the expected schema
- **THEN** the system persists the structured result fields and sets the analysis status to `ready`

#### Scenario: Schema validation
- **WHEN** the LLM returns output
- **THEN** the system validates the output against a strict schema before persisting, and only conforming output is accepted as `ready`

### Requirement: Controlled category and bias taxonomies
The system SHALL constrain the decision category to a fixed enumeration and SHALL constrain cognitive biases to a fixed catalog, so that filtering and aggregation are deterministic.

#### Scenario: Category from fixed set
- **WHEN** the analysis assigns a category
- **THEN** the category is one of: Career, Financial, Relationship, Health, Business/Work, Education, Lifestyle, Other

#### Scenario: Biases from fixed catalog
- **WHEN** the analysis lists cognitive biases
- **THEN** each bias is drawn from the fixed catalog (confirmation, availability, loss aversion, sunk cost, overconfidence, anchoring, status quo, present bias) and includes a short explanation of how it may apply

### Requirement: Memory-informed analysis
The system SHALL recall a user's semantically similar prior decisions and provide them as context to the analysis, so reflections can surface recurring patterns. Recall SHALL be scoped to the requesting user, and the analysis SHALL succeed when no prior decisions exist.

#### Scenario: Prior decisions inform a new analysis
- **WHEN** analysis runs for a decision and the user has prior analyzed decisions that are semantically similar
- **THEN** the system retrieves those prior decisions, scoped to that user, and includes them as context for the analysis

#### Scenario: No prior memory
- **WHEN** analysis runs for a user's first decision, or no similar prior decisions exist
- **THEN** memory recall contributes no context and the analysis proceeds and completes normally

#### Scenario: Memory is per-user isolated
- **WHEN** memory is recalled for a decision
- **THEN** only the requesting user's prior decisions are eligible, and no other user's decisions are ever recalled

#### Scenario: Successful analysis is remembered
- **WHEN** an analysis transitions to `ready`
- **THEN** the system records the decision in the user's memory so it is eligible to inform future analyses

### Requirement: Output language follows the user's locale
The system SHALL generate the free-form analysis text (missed alternatives, premortem risks, key assumptions, early warning signs) in the user's selected locale, while category and cognitive-bias values remain language-neutral controlled-taxonomy identifiers.

#### Scenario: Free-form output in selected locale
- **WHEN** a user whose selected locale is Ukrainian triggers an analysis
- **THEN** the free-form text fields are generated in Ukrainian

#### Scenario: Taxonomies stay language-neutral
- **WHEN** an analysis is generated in any locale
- **THEN** the stored category and bias values are the language-neutral controlled-taxonomy identifiers, so filtering and aggregation remain deterministic across locales

### Requirement: Analysis lifecycle status
The system SHALL maintain an explicit status for every analysis with the values `processing`, `ready`, and `failed`, and SHALL transition between them as the work progresses.

#### Scenario: Processing to ready
- **WHEN** analysis work completes successfully with valid output
- **THEN** the status transitions from `processing` to `ready` and results become available

#### Scenario: Processing to failed
- **WHEN** the LLM call errors or returns output that fails validation
- **THEN** the status transitions from `processing` to `failed` and a human-readable failure reason is recorded

#### Scenario: Status is queryable
- **WHEN** a client requests the status of a decision's analysis
- **THEN** the system returns the current status so the UI can reflect it

### Requirement: Retry of failed analysis
The system SHALL allow an authenticated owner to retry analysis for a decision whose analysis failed.

#### Scenario: Retry after failure
- **WHEN** the owner triggers retry on a `failed` analysis
- **THEN** the system starts the analysis work again, moving status back to `processing`, and on success records a `ready` result

#### Scenario: Stalled analysis is retryable
- **WHEN** an analysis remains in `processing` beyond a defined timeout threshold
- **THEN** the system surfaces it as retryable so the owner is never left without recourse

### Requirement: Re-analysis with version history
The system SHALL allow an authenticated owner to re-analyze a decision, appending each run as a new analysis version while retaining prior versions.

#### Scenario: Re-analysis creates a new version
- **WHEN** the owner re-analyzes a decision that already has a `ready` analysis
- **THEN** the system creates a new analysis version in `processing`, runs the pipeline, and on success the newest `ready` version becomes the current analysis

#### Scenario: Prior versions retained
- **WHEN** a decision has more than one analysis version
- **THEN** the system retains all versions and the owner can view a prior version in addition to the current one

### Requirement: Server-side provider access
The system SHALL perform all LLM provider calls server-side and SHALL never expose the provider API key to the client.

#### Scenario: Key not exposed
- **WHEN** any analysis is performed
- **THEN** the LLM request originates from the server and the provider credential is not present in any client-delivered code or response
