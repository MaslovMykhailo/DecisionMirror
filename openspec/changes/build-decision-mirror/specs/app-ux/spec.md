## ADDED Requirements

### Requirement: Loading, error, and retry states
The system SHALL present clear loading, error, and retry affordances for asynchronous operations across the application.

#### Scenario: Loading state
- **WHEN** the app is fetching data or an analysis is in progress
- **THEN** the relevant UI shows a loading indicator rather than an empty or broken view

#### Scenario: Error with retry
- **WHEN** an operation fails (including a failed analysis)
- **THEN** the UI shows a human-readable error explanation and, where the action is repeatable, a retry control

#### Scenario: Analysis not ready explanation
- **WHEN** a user views a decision whose analysis is not yet complete
- **THEN** the UI explains that the analysis is still being generated rather than implying results are missing or lost

### Requirement: Dark theme
The system SHALL support a dark theme that the user can toggle, with the preference persisted across sessions.

#### Scenario: Toggling theme
- **WHEN** a user switches between light and dark theme
- **THEN** the interface updates immediately and the chosen preference persists on subsequent visits

#### Scenario: System default
- **WHEN** a user has not chosen a theme
- **THEN** the app follows the operating system's color-scheme preference by default
