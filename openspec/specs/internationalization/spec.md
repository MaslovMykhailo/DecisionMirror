# internationalization Specification

## Purpose

Defines how Decision Mirror presents its interface in multiple languages: the supported
locale set and its single source of truth, locale-scoped routing and per-request locale
negotiation, the language switcher and cookie-based persistence, locale-correct formatting
helpers, localized labels for the language-neutral controlled taxonomies, and message-catalog
completeness enforced by the offline test gate.

## Requirements

### Requirement: Supported languages

The system SHALL provide its user interface in English and Ukrainian, with English as the
default language. The set of supported locales SHALL be defined in a single source of truth that
all routing, request configuration, and the language switcher reference.

#### Scenario: Default language

- **WHEN** a visitor arrives with no stored language preference
- **THEN** the interface is presented in English

#### Scenario: Ukrainian interface

- **WHEN** a user selects Ukrainian
- **THEN** all user-facing interface strings are presented in Ukrainian

#### Scenario: Unsupported locale resolves to default

- **WHEN** a request targets a locale that is not in the supported set
- **THEN** the system resolves to the default language (English) rather than erroring

### Requirement: Locale-scoped routing

The system SHALL scope routes by locale under an `app/[locale]/…` segment, and SHALL negotiate
the active locale on each request from the stored preference, falling back to the default.

#### Scenario: Locale segment selects messages

- **WHEN** a route under a supported `[locale]` segment is rendered
- **THEN** the messages and formatters for that locale are loaded and made available to the
  rendered components

#### Scenario: Missing locale segment redirects to a resolved locale

- **WHEN** a request arrives without a locale segment
- **THEN** the system routes it to the user's persisted locale, or to the default locale when
  none is stored

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

### Requirement: Locale-correct formatting

The system SHALL format dates, numbers, and relative times according to the active language using
shared formatting helpers, so feature code never hand-formats locale-sensitive values.

#### Scenario: Formatting follows locale

- **WHEN** dates, numbers, or relative times are displayed
- **THEN** they are formatted according to the active language's conventions

### Requirement: Controlled taxonomies are localized as labels

The system SHALL display decision categories and cognitive-bias names translated into the active
language, while storing and aggregating them as the language-neutral identifiers defined by the
`domain-taxonomy` capability. Translated labels SHALL be keyed by those identifiers in the
message catalogs.

#### Scenario: Translated taxonomy labels

- **WHEN** a decision category or cognitive bias is displayed in the interface
- **THEN** its label is shown in the active language, resolved from the message catalog by the
  language-neutral identifier

#### Scenario: Aggregation is language-independent

- **WHEN** decisions created under different languages are filtered or aggregated
- **THEN** filtering and aggregation operate on the language-neutral identifiers and produce
  consistent results regardless of the language each decision was created in

### Requirement: Message catalog completeness

The system SHALL maintain message catalogs for every supported language with matching key sets,
and SHALL provide typed access to messages so that a missing or mismatched key is detectable in
the offline test gate rather than at runtime.

#### Scenario: Catalogs have matching keys

- **WHEN** the English and Ukrainian message catalogs are compared
- **THEN** every key present in one catalog is present in the other

#### Scenario: Missing key fails the gate

- **WHEN** a referenced message key is absent from a catalog
- **THEN** the offline test gate fails rather than rendering a missing-translation placeholder in
  production

### Requirement: Language switch is free of client script warnings

The language switcher SHALL change between supported locales without causing React to render a raw
`<script>` tag through the client component tree. Locale switching SHALL preserve the existing
theme and observability provider behavior while avoiding script-tag runtime warnings.

#### Scenario: Switching locale has no script warning

- **WHEN** a user switches from English to Ukrainian or from Ukrainian to English in a browser
- **THEN** the route updates to the selected locale
- **AND** the browser console does not receive the React warning about encountering a script tag
  while rendering a component

#### Scenario: Theme behavior survives locale switch

- **WHEN** a user has selected a light, dark, or system theme and then switches locale
- **THEN** the selected theme behavior remains active after the locale change
