## MODIFIED Requirements

### Requirement: Language selection and persistence

The system SHALL allow a user to switch the interface language through a language switcher, and
SHALL persist the chosen language across sessions via a cookie. The language switcher SHALL be
available on both authenticated pages and the unauthenticated login and signup pages. The
switcher control SHALL render with a height that matches the adjacent navigation controls so the
controls align on a single row.

#### Scenario: Switching language

- **WHEN** a user switches the interface language
- **THEN** the interface updates to the selected language

#### Scenario: Preference persists across sessions

- **WHEN** a user who previously selected a language returns in a later session
- **THEN** the interface is presented in their previously selected language without requiring
  re-selection

#### Scenario: Switcher available before authentication

- **WHEN** a visitor is on the unauthenticated login or signup page
- **THEN** the language switcher is available and switches the interface language

#### Scenario: Switcher aligns with adjacent controls

- **WHEN** the language switcher is rendered next to other navigation controls
- **THEN** its control height matches those controls so they align on a single row
