## ADDED Requirements

### Requirement: Fixed decision-category enum as a single source of truth

The system SHALL define the decision `category` as a fixed enumeration of language-neutral
identifiers in one place, backed by a Zod schema. All producers and consumers (the LLM
output contract, persistence, filtering, and dashboard aggregation) SHALL reference this
single definition rather than redeclaring category values.

#### Scenario: Category values are validated against the enum

- **WHEN** a value is checked against the category schema
- **THEN** only an identifier defined in the canonical enum passes validation
- **AND** any other value is rejected

#### Scenario: Identifiers are language-neutral

- **WHEN** the category enum is inspected
- **THEN** its members are stable language-neutral identifiers (display labels are provided by `internationalization`, not stored in the enum)

### Requirement: Fixed catalog of eight cognitive biases

The system SHALL define a fixed catalog of exactly eight cognitive biases as
language-neutral identifiers in one place, backed by a Zod schema. The LLM SHALL select
biases only from this catalog, keeping filtering and aggregation deterministic.

#### Scenario: Catalog contains exactly eight biases

- **WHEN** the bias catalog is enumerated
- **THEN** it contains exactly eight distinct, stable identifiers

#### Scenario: Bias values are validated against the catalog

- **WHEN** a value is checked against the bias schema
- **THEN** only an identifier present in the eight-entry catalog passes validation
- **AND** any other value is rejected

### Requirement: Taxonomies are reused, never duplicated

The category enum and bias catalog SHALL be importable from a single module so that
downstream schemas (notably the agent output contract) compose them by reference. The
system SHALL NOT contain a second, independent declaration of either taxonomy.

#### Scenario: Downstream schema composes the canonical taxonomy

- **WHEN** another Zod schema needs category or bias values
- **THEN** it imports and composes the canonical enum/catalog definitions
- **AND** changing a taxonomy member in the single source updates every consumer
