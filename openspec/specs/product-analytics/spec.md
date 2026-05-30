# product-analytics Specification

## Purpose

Define PostHog product analytics across server and client, a fixed business event taxonomy
emitted once per occurrence, event-privacy guarantees (identifiers, enums, counts, durations
only), and core business dashboards reproducible from the taxonomy — without depending on any
raw decision content.

## Requirements

### Requirement: PostHog client and server integration

The system SHALL integrate PostHog for product analytics on both the server (via
`posthog-node`) and the client (via `posthog-js`), identifying events to the authenticated
user where a user is present. Capture MUST be a no-op when no PostHog key is configured so
local and test runs send nothing, and server-side captures MUST be flushed appropriately for
the serverless runtime so events are not lost when the response completes.

#### Scenario: Server event identified to user

- **WHEN** a server-side business event is emitted for an authenticated user with a PostHog key configured
- **THEN** PostHog records the event associated with that user's identifier

#### Scenario: Disabled when key absent

- **WHEN** no PostHog key is configured
- **THEN** event capture is a no-op and no network call is made

#### Scenario: Server events flushed before completion

- **WHEN** a server-side event is captured during a request that is about to complete
- **THEN** the event is flushed so it is not dropped when the serverless invocation ends

### Requirement: Business event taxonomy

The system SHALL emit the defined business event taxonomy at the points where each event
occurs. The events and their properties are:

- `decision_created` — `category?`, `has_reasoning`
- `analysis_started` — `version`
- `analysis_ready` — `duration_ms`, `bias_count`, `complexity`
- `analysis_failed` — `reason_class`
- `analysis_retried` — `trigger` (`manual` | `stalled`)
- `reanalysis_run` — `prior_version`
- `dashboard_viewed` — (no properties)
- `locale_switched` — `from`, `to`

Each event MUST be emitted exactly once per occurrence of its triggering action.

#### Scenario: Decision capture emits decision_created

- **WHEN** an authenticated user successfully captures a decision
- **THEN** a `decision_created` event is emitted with `has_reasoning` and an optional `category`

#### Scenario: Pipeline lifecycle emits started and ready

- **WHEN** an analysis begins and later completes successfully
- **THEN** `analysis_started` is emitted with `version`
- **AND** `analysis_ready` is emitted with `duration_ms`, `bias_count`, and `complexity`

#### Scenario: Pipeline failure emits analysis_failed

- **WHEN** an analysis transitions to `failed`
- **THEN** `analysis_failed` is emitted with a `reason_class`

#### Scenario: Retry and re-analysis are distinguished

- **WHEN** an analysis is retried
- **THEN** `analysis_retried` is emitted with `trigger` of `manual` or `stalled`
- **AND** when a user re-runs analysis on an existing decision, `reanalysis_run` is emitted
  with `prior_version`

#### Scenario: Dashboard view and locale switch are tracked

- **WHEN** an authenticated user views the analytics dashboard
- **THEN** a `dashboard_viewed` event is emitted
- **AND** when the user switches UI locale, `locale_switched` is emitted with `from` and `to`

### Requirement: Analytics event privacy

The system SHALL ensure analytics events carry only identifiers, enums, counts, and
durations. No event property MAY contain raw decision text, reasoning prose, or analysis
prose. Free-form user content MUST be reduced to booleans, enums, or counts before capture.

#### Scenario: Reasoning reduced to a boolean

- **WHEN** `decision_created` is emitted for a decision that includes reasoning text
- **THEN** the event carries `has_reasoning: true`
- **AND** the event contains no reasoning text

#### Scenario: No prose in any event

- **WHEN** any taxonomy event is captured
- **THEN** its properties contain only identifiers, enums, counts, or durations
- **AND** contain no raw decision or analysis prose

### Requirement: Core business dashboards

The system SHALL define core business dashboards in PostHog derived solely from the event
taxonomy: an activation funnel (signup → first decision → first ready analysis); a
reliability view of ready vs failed vs stalled rates; and a time-to-ready latency view
reporting p50 and p95. These dashboards MUST be reproducible from event definitions captured
in the change (so they can be recreated) and MUST NOT depend on any raw decision content.

#### Scenario: Activation funnel is defined

- **WHEN** the activation dashboard is provisioned
- **THEN** it expresses the signup → first-decision → first-ready-analysis funnel from
  taxonomy events

#### Scenario: Reliability view is defined

- **WHEN** the reliability dashboard is provisioned
- **THEN** it reports ready, failed, and stalled rates from taxonomy events

#### Scenario: Time-to-ready latency is defined

- **WHEN** the latency dashboard is provisioned
- **THEN** it reports p50 and p95 time-to-ready derived from `analysis_ready` `duration_ms`
