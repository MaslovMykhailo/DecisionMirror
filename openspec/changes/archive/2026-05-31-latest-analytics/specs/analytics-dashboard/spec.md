## MODIFIED Requirements

### Requirement: User-scoped dashboard aggregation

The system SHALL provide an authenticated server-side dashboard read model that returns
category frequency and cognitive-bias frequency for the current user. Aggregation MUST be
scoped through the authenticated user's `userId`, MUST include only analyses whose status
is `ready`, and MUST NOT include raw decision text or analysis prose in its returned chart
data.

The read model SHALL accept an aggregation `mode`:

- In **latest** mode (the default), aggregation MUST include exactly one analysis per
  decision — the newest `ready` version — so that re-analyzed decisions are counted once.
- In **all** mode, aggregation MUST include every `ready` analysis across all versions.

Both modes MUST run a single user-scoped aggregation per chart (no per-decision N+1) and MUST
NOT require a schema change beyond the existing `(decisionId, version)` index. An unrecognized
mode value MUST be treated as `latest`.

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

#### Scenario: Latest mode counts each decision once

- **WHEN** an authenticated user has a decision with multiple `ready` analysis versions
- **AND** the dashboard read model runs in latest mode
- **THEN** only the newest `ready` version of that decision contributes to category and bias
  counts
- **AND** older ready versions of the same decision do not add to the counts

#### Scenario: All-versions mode counts every ready analysis

- **WHEN** an authenticated user has a decision with multiple `ready` analysis versions
- **AND** the dashboard read model runs in all-versions mode
- **THEN** every `ready` version of that decision contributes to category and bias counts

#### Scenario: Latest mode ignores newer non-ready versions

- **WHEN** a decision's newest version is `processing` or `failed` but an earlier version is
  `ready`
- **AND** the dashboard read model runs in latest mode
- **THEN** that decision's latest `ready` version contributes to the counts
- **AND** the newer non-ready version does not shadow it or remove the decision from the counts

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

## ADDED Requirements

### Requirement: Dashboard analytics mode toggle

The analytics dashboard SHALL present a toggle that lets the authenticated user switch between
**latest** mode (default) and **all-versions** mode. The selected mode MUST drive the
server-side aggregation that produces the charts. The default mode, when none is selected, MUST
be latest. The toggle and its labels MUST be localized through the existing localization
helpers and MUST NOT expose decision content.

#### Scenario: Default mode is latest

- **WHEN** an authenticated user opens the analytics dashboard without selecting a mode
- **THEN** the dashboard renders in latest mode
- **AND** the latest-mode toggle option is shown as active

#### Scenario: Switching to all-versions re-aggregates

- **WHEN** an authenticated user selects the all-versions mode in the toggle
- **THEN** the dashboard charts re-aggregate using all `ready` analysis versions
- **AND** the selected mode is reflected in the page address so a refresh preserves it

#### Scenario: Switching back to latest re-aggregates

- **WHEN** an authenticated user in all-versions mode selects the latest mode
- **THEN** the dashboard charts re-aggregate using only the newest `ready` version per decision

#### Scenario: Mode toggle does not expose decision content

- **WHEN** the dashboard mode toggle renders in either mode
- **THEN** it shows only localized mode labels and chart aggregates
- **AND** it does not render raw decision text or analysis prose
