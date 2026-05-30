## ADDED Requirements

### Requirement: Supported languages
The system SHALL provide its user interface in English and Ukrainian, with English as the default.

#### Scenario: Default language
- **WHEN** a visitor arrives with no language preference set
- **THEN** the interface is presented in English

#### Scenario: Ukrainian interface
- **WHEN** a user selects Ukrainian
- **THEN** all user-facing interface strings are presented in Ukrainian

### Requirement: Language selection and persistence
The system SHALL allow a user to switch the interface language, and SHALL persist the chosen language across sessions.

#### Scenario: Switching language
- **WHEN** a user switches the interface language
- **THEN** the interface updates to the selected language and the choice persists on subsequent visits

### Requirement: Locale-correct formatting
The system SHALL format dates, numbers, and relative times according to the active language.

#### Scenario: Formatting follows locale
- **WHEN** dates, numbers, or relative times are displayed
- **THEN** they are formatted according to the active language's conventions

### Requirement: Controlled taxonomies are localized as labels
The system SHALL display decision categories and cognitive-bias names translated into the active language, while storing and aggregating them as language-neutral identifiers.

#### Scenario: Translated taxonomy labels
- **WHEN** a category or cognitive bias is displayed in the interface
- **THEN** its label is shown in the active language

#### Scenario: Aggregation is language-independent
- **WHEN** decisions created under different languages are filtered or aggregated
- **THEN** filtering and aggregation operate on the language-neutral identifiers and produce consistent results regardless of the language each decision was created in
</content>
