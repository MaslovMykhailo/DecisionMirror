## ADDED Requirements

### Requirement: Decision complexity is derived from the newest ready analysis

The system SHALL derive a nullable complexity value for each listed decision from the
newest ready analysis. Complexity MUST equal the count of biases plus the count of
premortem risks plus the count of missed alternatives from that ready analysis. A decision
without a ready analysis MUST have no complexity value.

#### Scenario: Ready analysis has derived complexity

- **WHEN** a listed decision has a newest ready analysis with two biases, three premortem
  risks, and one missed alternative
- **THEN** the decision history read model exposes complexity `6` for that decision

#### Scenario: Processing-only decision has no complexity

- **WHEN** a listed decision has no ready analysis result
- **THEN** the decision history read model exposes no complexity value for that decision
- **AND** the decision remains eligible to appear in the unfiltered list

#### Scenario: Newer processing analysis does not replace current ready complexity

- **WHEN** a listed decision has an older ready analysis and a newer processing analysis
- **THEN** complexity is derived from the older ready analysis
- **AND** the newest analysis status still represents the newer processing analysis

### Requirement: Decision history can be filtered by analysis category and bias

The system SHALL allow the authenticated decision history list to be filtered by category
from the canonical decision-category taxonomy and by presence of a cognitive bias from the
canonical bias taxonomy. Filters MUST evaluate against the newest ready analysis for each
decision, and all decision queries MUST remain scoped to the authenticated session user's
`userId`.

#### Scenario: Category filter returns matching ready decisions

- **WHEN** an authenticated user filters the decision history by category `career`
- **THEN** the list includes the user's decisions whose newest ready analysis category is
  `career`
- **AND** the list excludes the user's decisions whose newest ready analysis category is a
  different category

#### Scenario: Bias filter returns decisions containing selected bias

- **WHEN** an authenticated user filters the decision history by bias `confirmation_bias`
- **THEN** the list includes the user's decisions whose newest ready analysis contains that
  bias
- **AND** the list excludes the user's decisions whose newest ready analysis does not
  contain that bias

#### Scenario: Category and bias filters combine

- **WHEN** an authenticated user applies both a category filter and a bias filter
- **THEN** the list includes only decisions whose newest ready analysis matches the
  selected category and contains the selected bias

#### Scenario: Filtered reads preserve user isolation

- **WHEN** an authenticated user applies any decision history filter
- **THEN** the system queries decisions scoped to the authenticated session user's `userId`
- **AND** the list excludes matching decisions owned by any other user

#### Scenario: Invalid filter values are ignored

- **WHEN** the decision history page receives a category or bias value outside the canonical
  taxonomy
- **THEN** the invalid value is not applied as a filter
- **AND** the page renders the list using only valid filters and default behavior

### Requirement: Decision history can be sorted by creation time and complexity

The system SHALL allow the authenticated decision history list to be sorted by creation
time and by derived complexity. Creation-time sorting MUST include all listed decisions.
Complexity sorting MUST order decisions without a ready analysis after decisions with a
complexity value.

#### Scenario: Creation-time sort orders decisions by created timestamp

- **WHEN** an authenticated user sorts the decision history by creation time
- **THEN** the list is ordered by each decision's `createdAt` timestamp
- **AND** decisions without a ready analysis remain in the ordered list

#### Scenario: Complexity sort orders ready decisions by complexity

- **WHEN** an authenticated user sorts the decision history by complexity
- **THEN** decisions with ready analyses are ordered by their derived complexity
- **AND** ties are resolved deterministically without changing per-user scoping

#### Scenario: Complexity sort places no-ready decisions last

- **WHEN** an authenticated user sorts the decision history by complexity and the result set
  includes decisions without a ready analysis
- **THEN** decisions with derived complexity appear before decisions without derived
  complexity
- **AND** the no-ready decisions still show their current processing, failed, stalled, or
  absent analysis state

#### Scenario: Invalid sort value falls back to default

- **WHEN** the decision history page receives an unknown sort value
- **THEN** the system uses the default creation-time sort
- **AND** the page does not fail or expose another user's data

### Requirement: Decision history exposes localized filter and sort controls

The system SHALL render filter and sort controls in the authenticated decision history
list. The controls MUST use localized display labels while preserving canonical taxonomy
and sort identifiers in the URL/query state.

#### Scenario: Controls show canonical taxonomy options as localized labels

- **WHEN** an authenticated user opens the decision history list
- **THEN** the category filter control offers every canonical decision category using
  localized labels
- **AND** the bias filter control offers every canonical cognitive bias using localized
  labels

#### Scenario: Selecting a control updates rendered list state

- **WHEN** an authenticated user selects a category, bias, or sort option
- **THEN** the list updates to render decisions matching the selected query state
- **AND** the selected option remains reflected in the visible controls after navigation or
  refresh

#### Scenario: Filtered empty state is distinct from no decisions

- **WHEN** an authenticated user has saved decisions but the selected filters match no
  decisions
- **THEN** the history list renders an empty filtered-result state
- **AND** the state does not imply that the user has no saved decisions
