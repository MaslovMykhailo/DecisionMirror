## ADDED Requirements

### Requirement: No production Sentry example route

The system SHALL NOT expose scaffolded Sentry example or demo pages as application routes.
Sentry verification SHALL be covered by deterministic tests and intentional instrumentation
checks rather than a public localized page.

#### Scenario: Sentry example page is absent

- **WHEN** the application route tree is inspected
- **THEN** no route exists at `/en/sentry-example-page`, `/uk/sentry-example-page`, or any other
  localized Sentry example path

#### Scenario: Error tracking remains covered

- **WHEN** the Sentry example page is removed
- **THEN** Sentry browser/server/edge initialization, release tagging, and payload scrubbing remain
  covered by tests
