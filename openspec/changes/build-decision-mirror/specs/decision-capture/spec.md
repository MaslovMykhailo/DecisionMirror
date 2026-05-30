## ADDED Requirements

### Requirement: Create a decision record
The system SHALL allow an authenticated user to create a decision record by providing a situation description and the decision they made, with personal reasoning as an optional field.

#### Scenario: Successful creation
- **WHEN** a user submits the form with a non-empty situation and a non-empty decision (reasoning optional)
- **THEN** the system persists a decision owned by that user with the captured text and a creation timestamp, and confirms creation to the user

#### Scenario: Missing required fields
- **WHEN** a user submits the form with an empty situation or an empty decision
- **THEN** the system rejects the submission, shows field-level validation errors, and persists nothing

#### Scenario: Optional reasoning omitted
- **WHEN** a user submits the form with situation and decision but no reasoning
- **THEN** the system creates the decision successfully with an empty reasoning value

### Requirement: Analysis is triggered on creation
The system SHALL initiate background analysis automatically when a decision is created, without blocking the user's submission.

#### Scenario: Background analysis enqueued
- **WHEN** a decision is successfully created
- **THEN** the system creates an associated analysis in `processing` status and triggers the analysis work out-of-band, returning control to the user immediately

#### Scenario: User is not blocked
- **WHEN** a user submits a decision and the LLM analysis has not yet completed
- **THEN** the user can navigate away or continue using the app while the analysis runs in the background
