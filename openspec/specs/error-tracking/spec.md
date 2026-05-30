# error-tracking Specification

## Purpose

Define Sentry-based error and performance capture across all Next.js runtimes, with
async-pipeline failure visibility, central PII scrubbing of event payloads, and release
health attribution — so failures are diagnosable and attributable to a deploy without ever
sending raw decision content.

## Requirements

### Requirement: Multi-runtime Sentry error and performance capture

The system SHALL initialize Sentry across all three Next.js runtimes — browser, Node.js
server, and edge — so that uncaught exceptions, unhandled rejections, and performance
traces are captured in every execution context. Initialization MUST be driven from the
runtime config files produced by the Next.js Sentry setup (`instrumentation.ts`,
`instrumentation-client.ts`, and server/edge config) and MUST be a no-op when no Sentry DSN
is configured, so local and test runs neither send events nor error.

#### Scenario: Server exception is captured

- **WHEN** an unhandled exception occurs in a server route handler with a Sentry DSN configured
- **THEN** Sentry captures the exception with its stack trace and runtime context

#### Scenario: Client exception is captured

- **WHEN** an unhandled exception or rejection occurs in the browser runtime with a DSN configured
- **THEN** Sentry captures the event from the client runtime

#### Scenario: Disabled when DSN absent

- **WHEN** no Sentry DSN is configured
- **THEN** Sentry initialization is a no-op
- **AND** no events are sent and no error is thrown

### Requirement: Async-pipeline failure visibility

The system SHALL report failures of the async analysis pipeline to Sentry with enough
context to distinguish failure modes. A `runAgent` failure MUST be captured with the
`decisionId`, the failing node name, and a failure class that separates validation failures
from provider/runtime failures. Analyses that remain in `processing` past the durability
timeout MUST be surfaced as a distinct stalled condition rather than a generic error.

#### Scenario: Agent failure captured with node and class

- **WHEN** `runAgent` fails for a decision
- **THEN** Sentry receives an event including the `decisionId`, the node where it failed, and
  a failure class distinguishing validation from provider/runtime error

#### Scenario: Stalled analysis surfaced distinctly

- **WHEN** an analysis remains in `processing` past the configured timeout
- **THEN** the stalled condition is reported as its own signal, separate from agent exceptions

### Requirement: Error payload PII scrubbing

The system SHALL ensure no raw decision text or analysis prose is sent to Sentry. Event
payloads MUST carry only identifiers, enums, status values, counts, and durations.
Scrubbing MUST be enforced centrally (e.g. a `beforeSend` hook) so it applies regardless of
where the error originates.

#### Scenario: Decision text never leaves in an event

- **WHEN** an error occurs while handling a decision that contains user prose
- **THEN** the Sentry event contains the decision identifier and status
- **AND** the event contains no raw decision text or analysis prose

#### Scenario: Central scrub applies to all events

- **WHEN** any event is about to be sent to Sentry from any runtime
- **THEN** the central scrubbing hook strips disallowed fields before transmission

### Requirement: Release health attribution

The system SHALL associate Sentry events with a release identifier derived from the
deployment's git SHA so that a regression can be attributed to a specific deploy, and source
maps MUST be uploaded at build time so stack traces resolve to TypeScript source.

#### Scenario: Event carries release identifier

- **WHEN** an event is captured in a deployed environment
- **THEN** it is tagged with a release identifier derived from the git SHA

#### Scenario: Stack trace maps to source

- **WHEN** a captured server exception is viewed in Sentry for a build with uploaded source maps
- **THEN** its frames resolve to TypeScript source locations

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
