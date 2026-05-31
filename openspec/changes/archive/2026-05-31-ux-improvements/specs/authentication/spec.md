## ADDED Requirements

### Requirement: Theme and language controls on auth pages

The unauthenticated login and signup pages SHALL present a theme control (light / dark / system)
and a language control, so a visitor can adjust appearance and interface language before
authenticating. Selecting a theme or language on an auth page MUST take effect without requiring
the visitor to sign in first.

#### Scenario: Theme control on the login page

- **WHEN** a visitor opens the login page
- **THEN** a theme control offering light, dark, and system is presented
- **AND** selecting a theme updates the interface appearance immediately

#### Scenario: Language control on the auth pages

- **WHEN** a visitor opens the login or signup page
- **THEN** a language control is presented
- **AND** selecting a language updates the interface language without requiring sign-in
