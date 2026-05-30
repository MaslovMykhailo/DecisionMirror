## ADDED Requirements

### Requirement: Decision and bias frequency dashboard
The system SHALL provide the authenticated user a dashboard that visualizes the frequency of their decision categories and of cognitive biases across their decisions.

#### Scenario: Category frequency
- **WHEN** a user with one or more analyzed decisions opens the dashboard
- **THEN** the system shows a visualization of how often each decision category occurs across the user's decisions

#### Scenario: Bias frequency
- **WHEN** a user with one or more analyzed decisions opens the dashboard
- **THEN** the system shows a visualization of how often each cognitive bias appears across the user's decisions

#### Scenario: Only the user's data
- **WHEN** the dashboard aggregates data
- **THEN** it includes only decisions owned by the signed-in user and only counts results from `ready` analyses

#### Scenario: Insufficient data
- **WHEN** a user has no `ready` analyses yet
- **THEN** the dashboard shows an empty state explaining that insights appear once decisions have been analyzed
