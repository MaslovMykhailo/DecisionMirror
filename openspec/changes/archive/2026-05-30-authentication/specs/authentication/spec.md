## ADDED Requirements

### Requirement: Account registration

The system SHALL allow a visitor to create an account using an email address and password. The system MUST validate registration input server-side, store only a secure password hash, and establish an authenticated session for the newly created user.

#### Scenario: Successful signup

- **WHEN** a visitor submits a valid unused email address and a password that satisfies the password rules
- **THEN** the system creates a user with a password hash, establishes an authenticated session for that user, and redirects the user to the authenticated application

#### Scenario: Duplicate signup email

- **WHEN** a visitor submits a signup request for an email address already associated with an account
- **THEN** the system rejects the signup, does not create another user, and returns a user-facing duplicate-email error

#### Scenario: Invalid signup input

- **WHEN** a visitor submits an invalid email address or a password that does not satisfy the password rules
- **THEN** the system rejects the signup with field-level validation errors and does not create a user

#### Scenario: Plaintext password is never persisted

- **WHEN** a visitor successfully signs up with email and password
- **THEN** the stored user record contains a password hash and does not contain the plaintext password

### Requirement: Email and password login

The system SHALL allow a registered credentials user to authenticate with email and password. Login failures MUST use a generic error that does not reveal whether the email address exists. Expected login failures MUST be rendered on the localized login page instead of exposing raw JSON or unhandled Auth.js errors.

#### Scenario: Successful credentials login

- **WHEN** a registered credentials user submits the correct email and password
- **THEN** the system establishes an authenticated session for that user and redirects the user to the authenticated application

#### Scenario: Credentials login is CSRF-safe

- **WHEN** a visitor submits the credentials login form from the localized login page
- **THEN** the system performs the Auth.js credentials sign-in with valid CSRF handling and does not raise `MissingCSRF`

#### Scenario: Incorrect password

- **WHEN** a registered credentials user submits the correct email with an incorrect password
- **THEN** the system denies access and renders a localized generic invalid-credentials error on the login page

#### Scenario: Unknown email

- **WHEN** a visitor submits a credentials login request for an email address with no account
- **THEN** the system denies access and renders the same localized generic invalid-credentials error used for an incorrect password

#### Scenario: Google-only user attempts password login

- **WHEN** a user whose account was created by Google sign-in has no password hash and submits a credentials login request
- **THEN** the system denies access and renders a localized generic invalid-credentials error

#### Scenario: Invalid login format

- **WHEN** a visitor submits the login form with an invalid email format or missing password
- **THEN** the system rejects the submission with localized field-level validation errors and marks the invalid fields for assistive technology

### Requirement: Google OAuth sign-in

The system SHALL allow a visitor to authenticate using a Google account through a server-mediated OAuth flow. OAuth client secrets MUST remain server-side.

#### Scenario: Google login action is CSRF-safe

- **WHEN** a visitor starts Google sign-in from the localized login page
- **THEN** the system starts the Auth.js Google provider flow with valid CSRF handling and does not raise `MissingCSRF`

#### Scenario: Google signup action is available and CSRF-safe

- **WHEN** a visitor starts Google sign-in from the localized signup page
- **THEN** the system starts the same Auth.js Google provider flow with valid CSRF handling and does not raise `MissingCSRF`

#### Scenario: First-time Google sign-in

- **WHEN** a visitor completes Google OAuth with a verified email address that is not already linked to an application account
- **THEN** the system creates a user linked to that Google identity, establishes an authenticated session, and redirects the user to the authenticated application

#### Scenario: Returning Google sign-in

- **WHEN** a user who previously signed in with Google completes Google OAuth for the same Google identity
- **THEN** the system re-establishes an authenticated session for the existing user and does not create a duplicate account

#### Scenario: Unverified Google email

- **WHEN** Google OAuth returns a profile whose email address is not verified by Google
- **THEN** the system denies sign-in and does not create or update an application user

#### Scenario: Existing unlinked email

- **WHEN** Google OAuth returns a verified email address that already belongs to an unlinked credentials account
- **THEN** the system denies automatic linking, does not create a duplicate user, and returns a provider-conflict sign-in error

#### Scenario: OAuth secret stays server-side

- **WHEN** the Google OAuth flow exchanges authorization data for tokens
- **THEN** the exchange occurs server-side and no Google client secret is exposed in client JavaScript or client-readable payloads

### Requirement: Session and logout

The system SHALL expose a single authenticated session contract for both credentials and Google users. Server-side code MUST be able to read the canonical authenticated `userId` from the session.

#### Scenario: Session contains canonical user ID

- **WHEN** an authenticated credentials or Google user accesses a server-rendered page, server action, or route handler
- **THEN** the server can read the authenticated user's canonical `userId` from the session

#### Scenario: Authenticated app renders logout action

- **WHEN** an authenticated user views a protected application page
- **THEN** the page renders a localized logout button that uses the configured logout flow

#### Scenario: Logout ends application access

- **WHEN** an authenticated user logs out
- **THEN** the system ends the active application session and subsequent protected-page or protected-API access requires authentication again

#### Scenario: Client-supplied owner ID is ignored

- **WHEN** an authenticated request includes a client-supplied `userId`, `ownerId`, or account identifier
- **THEN** the system ignores that value for authorization and uses only the session-derived `userId`

### Requirement: Protected access

The system SHALL require authentication for all decision capture, decision history, decision detail, analysis status, retry, re-analysis, dashboard, and memory-backed features.

#### Scenario: Unauthenticated protected page request

- **WHEN** an unauthenticated visitor requests a protected application page
- **THEN** the system redirects the visitor to the sign-in flow

#### Scenario: Unauthenticated protected API request

- **WHEN** an unauthenticated visitor requests a protected route handler or server action
- **THEN** the system denies the request without returning private decision or analysis data

#### Scenario: Auth pages remain available to visitors

- **WHEN** an unauthenticated visitor requests the signup or login page
- **THEN** the system renders the requested auth page without requiring an existing session

### Requirement: Auth page navigation and controls

The system SHALL make the login and signup flows discoverable from each other and SHALL expose supported provider actions on both pages.

#### Scenario: Login links to signup

- **WHEN** a visitor views the localized login page
- **THEN** the page includes a localized link to the signup page for the same locale

#### Scenario: Signup links to login

- **WHEN** a visitor views the localized signup page
- **THEN** the page includes a localized link to the login page for the same locale

#### Scenario: Signup includes Google provider action

- **WHEN** a visitor views the localized signup page
- **THEN** the page includes a Google sign-up button that starts the Google OAuth flow without requiring email/password input

### Requirement: Per-user data isolation

The system SHALL scope every decision, analysis, dashboard, and long-term-memory operation to the authenticated session user's `userId`.

#### Scenario: Scoped decision creation

- **WHEN** an authenticated user creates a decision
- **THEN** the system stores the decision with the session-derived `userId` as owner

#### Scenario: Scoped decision listing

- **WHEN** an authenticated user lists decisions or dashboard aggregates
- **THEN** the system returns only records owned by that session user

#### Scenario: Cross-user decision read is denied

- **WHEN** an authenticated user requests a decision owned by a different user
- **THEN** the system denies the request and does not return the other user's decision or analysis content

#### Scenario: Cross-user mutation is denied

- **WHEN** an authenticated user attempts to retry, re-analyze, update, or otherwise mutate a decision owned by a different user
- **THEN** the system denies the mutation and does not modify the other user's records

#### Scenario: Memory recall is user-scoped

- **WHEN** the analysis pipeline retrieves long-term memory records for an authenticated user's decision
- **THEN** the retrieval is filtered to memory records owned by that same `userId`
