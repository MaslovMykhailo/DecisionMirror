# analytics-dashboard Specification

## Purpose

Define the authenticated analytics dashboard read model and chart surface for category
and cognitive-bias frequency summaries over a user's ready analyses while preserving
per-user isolation and telemetry privacy.

## Requirements

### Requirement: User-scoped dashboard aggregation

The system SHALL provide an authenticated server-side dashboard read model that returns
category frequency and cognitive-bias frequency for the current user. Aggregation MUST be
scoped through the authenticated user's `userId`, MUST include only analyses whose status
is `ready`, and MUST NOT include raw decision text or analysis prose in its returned chart
data.

#### Scenario: Owner sees category frequency for ready analyses

- **WHEN** an authenticated user has ready analyses with categories in their own decisions
- **THEN** the dashboard read model returns one category-frequency row per category present
  in those ready analyses
- **AND** each row includes the canonical category identifier and count

#### Scenario: Owner sees bias frequency for ready analyses

- **WHEN** an authenticated user has ready analyses with cognitive-bias entries in their own
  decisions
- **THEN** the dashboard read model returns one bias-frequency row per bias present in those
  ready analyses
- **AND** each row includes the canonical bias identifier and count

#### Scenario: Processing and failed analyses are excluded

- **WHEN** an authenticated user has processing, failed, and ready analyses
- **THEN** the dashboard frequency counts include only the ready analyses
- **AND** processing and failed analyses do not affect category or bias counts

#### Scenario: Cross-user analysis data is excluded

- **WHEN** another user has ready analyses with categories or biases
- **THEN** those analyses do not contribute to the authenticated user's dashboard counts
- **AND** the returned data does not expose the other user's decision or analysis content

#### Scenario: Unauthenticated access is denied

- **WHEN** no authenticated user is available
- **THEN** the dashboard read model returns an unauthenticated state
- **AND** no aggregation query result is exposed

### Requirement: Dashboard chart rendering

The system SHALL render dashboard charts for category frequency and cognitive-bias
frequency using Recharts. The charts MUST consume existing design-system semantic tokens
and chart color tokens, and display taxonomy labels through the existing localization
helpers while keeping canonical identifiers in the read model.

#### Scenario: Category chart renders localized labels

- **WHEN** the dashboard receives category-frequency rows
- **THEN** it renders a category frequency chart
- **AND** the visible labels use localized category labels for the active locale

#### Scenario: Bias chart renders localized labels

- **WHEN** the dashboard receives bias-frequency rows
- **THEN** it renders a cognitive-bias frequency chart
- **AND** the visible labels use localized bias labels for the active locale

#### Scenario: Charts use design tokens

- **WHEN** the dashboard charts render
- **THEN** chart marks, text, grid lines, and tooltip surfaces use semantic or chart color
  tokens
- **AND** the charts render correctly in both light and dark themes

### Requirement: Dashboard empty state

The system SHALL render an explicit dashboard empty state when the authenticated user has
no ready analyses available for aggregation. The empty state MUST be based on the absence
of ready-analysis aggregation data, not merely on the absence of saved decisions.

#### Scenario: Empty state with no ready analyses

- **WHEN** an authenticated user has no ready analyses
- **THEN** the dashboard renders an empty state instead of empty charts
- **AND** the empty state does not expose raw decision content

#### Scenario: Decisions without ready analyses still show empty state

- **WHEN** an authenticated user has saved decisions whose newest analyses are processing
  or failed
- **THEN** the dashboard renders the empty state
- **AND** processing and failed analyses do not create zero-value chart rows
