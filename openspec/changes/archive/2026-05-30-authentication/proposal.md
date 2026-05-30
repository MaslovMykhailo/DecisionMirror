## Why

Decision Mirror stores private decision records and analysis history, so users need a real account boundary before any decision capture or reflection features are exposed. The architecture already selects Auth.js with Google OAuth plus email/password; this change turns that direction into an implementation-ready contract.

The current implementation still has auth-flow gaps: Auth.js can raise `MissingCSRF` during sign-in actions, the login and signup pages do not cross-link, login validation failures are not consistently rendered in the UI, signup does not expose Google sign-in, and authenticated users do not have an obvious logout control.

## What Changes

- Add account signup with email and password, including password validation, secure hashing, duplicate-email handling, and immediate session establishment after successful signup.
- Add login and logout for email/password accounts with generic invalid-credential errors.
- Add Google OAuth sign-in that creates or reuses a user account through the same application session interface.
- Ensure credentials login, Google login, Google signup, and logout submit through Auth.js-supported CSRF-safe flows instead of direct provider endpoint posts that can trigger `MissingCSRF`.
- Add bidirectional login/signup navigation links and a Google sign-up button using localized copy.
- Render a localized logout button in the authenticated application UI so users can end their session without navigating to a hidden route.
- Show localized field-level format errors and generic incorrect-credentials errors directly in the auth UI, with accessible invalid-field indications and no raw JSON error page for normal form failures.
- Protect all decision and analysis pages/actions/API routes behind an authenticated session.
- Scope every decision, analysis, memory, and dashboard query by the authenticated session user's `userId`.
- Add deterministic tests for auth validation, provider behavior boundaries, CSRF-safe auth submissions, auth-page navigation, error rendering, protected access, and cross-user data isolation.

## Capabilities

### New Capabilities

- `authentication`: User account registration, Google OAuth sign-in, email/password login/logout, protected access, and per-user data isolation.

### Modified Capabilities

- None.

## Impact

- Auth/session layer: Auth.js v5 configuration, Google provider, Credentials provider, Prisma adapter, JWT session strategy, password hashing, and session helper utilities.
- Database: uses the existing/auth-adapter-compatible `User`, `Account`, and `Session` models, with password-hash storage for credentials users.
- UI: localized signup, login, visible logout control, Google login/signup buttons, login/signup cross-links, auth error, and protected-route redirect flows.
- App/API surface: route handlers, Server Components, Server Actions, middleware, and data-access helpers must resolve the session server-side and scope queries by `userId`.
- Tests: unit tests for validation and password handling, integration tests for auth flows and data isolation, and deterministic Playwright coverage for sign-in/sign-out, Google auth button routing, CSRF-safe submissions, auth form errors, and protected-route redirects.
