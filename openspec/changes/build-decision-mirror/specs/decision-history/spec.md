## ADDED Requirements

### Requirement: Decision list
The system SHALL present the authenticated user a list of all of their decisions, each showing a summary and its current analysis status.

#### Scenario: Listing decisions
- **WHEN** an authenticated user opens the history view
- **THEN** the system shows their decisions with a summary of the situation/decision, the category (when available), and a visible status indicator (processing / ready / failed)

#### Scenario: Empty history
- **WHEN** a user who has created no decisions opens the history view
- **THEN** the system shows an empty state inviting them to create their first decision

### Requirement: Decision detail
The system SHALL provide a detail view for a decision that shows the original input text alongside the generated analysis.

#### Scenario: Viewing a ready decision
- **WHEN** a user opens a decision whose analysis is `ready`
- **THEN** the system shows the original situation, decision, and reasoning together with the category, cognitive biases, missed alternatives, premortem risks, key assumptions, and early warning signs

#### Scenario: Viewing a not-ready decision
- **WHEN** a user opens a decision whose analysis is `processing` or `failed`
- **THEN** the system shows the original input and a clear status message in place of results, with a retry action when applicable

#### Scenario: Switching analysis versions
- **WHEN** a decision has multiple analysis versions and the user selects a prior version
- **THEN** the system displays that version's results, indicating which version is current

### Requirement: Status visibility
The system SHALL make the processing status of analyses visible wherever decisions are shown.

#### Scenario: Status reflected without manual refresh
- **WHEN** a decision's analysis is `processing` and then becomes `ready` or `failed`
- **THEN** the UI reflects the updated status (via polling) without requiring the user to manually reload the page

### Requirement: Filtering decisions
The system SHALL allow the user to filter their decisions by category and by the presence of a specific cognitive bias.

#### Scenario: Filter by category
- **WHEN** a user selects a category filter
- **THEN** the list shows only the user's decisions whose current analysis has that category

#### Scenario: Filter by bias
- **WHEN** a user selects a cognitive bias filter
- **THEN** the list shows only the user's decisions whose current analysis includes that bias

### Requirement: Sorting decisions
The system SHALL allow the user to sort their decisions by creation time and by derived complexity.

#### Scenario: Sort by creation time
- **WHEN** a user chooses to sort by creation time
- **THEN** the list is ordered by the decision's creation timestamp in the selected direction

#### Scenario: Sort by complexity
- **WHEN** a user chooses to sort by complexity
- **THEN** the list is ordered by a derived complexity score computed from the current analysis as the count of biases plus premortem risks plus missed alternatives, with decisions lacking a ready analysis ordered last
