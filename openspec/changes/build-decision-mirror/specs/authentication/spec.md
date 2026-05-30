## ADDED Requirements

### Requirement: Account registration
The system SHALL allow a visitor to create an account using an email address and a password.

#### Scenario: Successful signup
- **WHEN** a visitor submits the signup form with a valid, unused email and a password meeting the minimum strength rules
- **THEN** the system creates a user with a securely hashed password, establishes an authenticated session, and redirects the user to the application

#### Scenario: Duplicate email
- **WHEN** a visitor submits the signup form with an email that already has an account
- **THEN** the system rejects the request and shows an error indicating the email is already registered, without revealing password details

#### Scenario: Invalid input
- **WHEN** a visitor submits the signup form with an invalid email or a password that does not meet the minimum rules
- **THEN** the system rejects the request and shows field-level validation errors, and no account is created

### Requirement: Sign in with Google
The system SHALL allow a visitor to authenticate using their Google account via OAuth, in addition to email and password.

#### Scenario: First-time Google sign-in
- **WHEN** a visitor without an existing account completes the Google OAuth flow
- **THEN** the system creates a user linked to that Google identity, establishes an authenticated session, and redirects the user to the application

#### Scenario: Returning Google sign-in
- **WHEN** a user who previously signed in with Google completes the Google OAuth flow again
- **THEN** the system re-establishes an authenticated session for the same user without creating a duplicate account

#### Scenario: Google sign-in is server-mediated
- **WHEN** the Google OAuth flow is performed
- **THEN** the exchange is handled server-side and no OAuth client secret is exposed to the client

### Requirement: Login and logout
The system SHALL allow a registered user to log in with their credentials and to log out, ending their session.

#### Scenario: Successful login
- **WHEN** a registered user submits correct email and password
- **THEN** the system establishes an authenticated session and grants access to the application

#### Scenario: Incorrect credentials
- **WHEN** a user submits an email/password combination that does not match an account
- **THEN** the system denies access and shows a generic "invalid credentials" error that does not disclose whether the email exists

#### Scenario: Logout
- **WHEN** an authenticated user logs out
- **THEN** the system terminates the session and subsequent access to protected pages requires logging in again

### Requirement: Protected access and per-user data isolation
The system SHALL require authentication for all decision and analysis features, and SHALL scope every user's data so that one user can never read or modify another user's decisions or analyses.

#### Scenario: Unauthenticated access blocked
- **WHEN** an unauthenticated visitor requests a protected page or API endpoint
- **THEN** the system denies access and redirects to (or returns) the login flow

#### Scenario: Cross-user access denied
- **WHEN** an authenticated user requests a decision or analysis that belongs to a different user
- **THEN** the system denies the request and does not return the other user's data

#### Scenario: Scoped listing
- **WHEN** an authenticated user lists their decisions
- **THEN** the system returns only decisions owned by that user
