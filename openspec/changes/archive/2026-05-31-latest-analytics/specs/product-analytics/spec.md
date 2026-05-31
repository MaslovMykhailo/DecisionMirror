## MODIFIED Requirements

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
- `dashboard_mode_changed` — `mode` (`latest` | `all`)
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

#### Scenario: Dashboard mode change is tracked

- **WHEN** an authenticated user switches the analytics dashboard mode between latest and
  all-versions
- **THEN** a `dashboard_mode_changed` event is emitted with `mode` of `latest` or `all`
- **AND** the event carries no decision content
