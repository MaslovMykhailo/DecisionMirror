## ADDED Requirements

### Requirement: Analytics page layout does not stretch content

The analytics dashboard page SHALL lay out its content from the top of the page and SHALL NOT
stretch its cards or empty state to fill the viewport height. The empty state and the chart cards
MUST render at their natural height without large injected vertical gaps.

#### Scenario: Empty state renders without distortion

- **WHEN** an authenticated user with no ready analyses opens the analytics page
- **THEN** the empty state renders at its natural height and is not stretched to fill the viewport

#### Scenario: Chart content renders without large gaps

- **WHEN** an authenticated user with ready analyses opens the analytics page
- **THEN** the chart cards render at their natural height
- **AND** no large vertical gap is injected below the content to fill the viewport
