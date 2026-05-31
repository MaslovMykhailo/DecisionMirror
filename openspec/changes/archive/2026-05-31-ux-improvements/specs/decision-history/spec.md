## ADDED Requirements

### Requirement: Complexity is shown in history and detail

The system SHALL display the derived analysis complexity in the UI. Each decision row whose newest
analysis is ready MUST show its complexity, and the decision detail view MUST show complexity for
a ready analysis. Complexity is derived from the ready analysis (the existing sum of biases,
premortem risks, and missed alternatives) and MUST NOT be shown for a decision that has no ready
analysis.

#### Scenario: Ready row shows complexity

- **WHEN** a listed decision has a ready newest analysis
- **THEN** the row shows that decision's complexity

#### Scenario: Non-ready row omits complexity

- **WHEN** a listed decision has no ready analysis
- **THEN** the row does not show a complexity value

#### Scenario: Detail view shows complexity

- **WHEN** an authenticated user opens the detail view of a decision with a ready analysis
- **THEN** the detail view shows the analysis complexity

### Requirement: History page layout does not stretch content

The decision history page SHALL lay out its content from the top of the page and SHALL NOT stretch
its cards, rows, or empty state to fill the viewport height. The empty state and populated rows
MUST render at their natural height without large injected vertical gaps.

#### Scenario: Empty state renders without distortion

- **WHEN** an authenticated user with no decisions opens the history page
- **THEN** the empty state renders at its natural height and is not stretched to fill the viewport

#### Scenario: Populated rows render without large gaps

- **WHEN** an authenticated user with decisions opens the history page
- **THEN** the filter card and decision rows render at their natural height
- **AND** no large vertical gaps are injected between them to fill the viewport
