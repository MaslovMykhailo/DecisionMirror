## Context

Decision Mirror is a private decision journal, so authentication is a prerequisite for the core capture, analysis, history, dashboard, memory, and telemetry flows. The current architecture already selects Auth.js v5 with Google OAuth and Credentials providers, Prisma-backed account storage, JWT sessions, and server-side `userId` scoping.

The first implementation pass left several user-facing and Auth.js integration gaps. Login can trigger Auth.js `MissingCSRF` during sign-in, Google OAuth is exposed through direct form posting to the provider endpoint, signup lacks a Google provider action, expected login validation/auth failures do not consistently round-trip as accessible UI state, and authenticated users lack an obvious logout control.

The implementation must preserve the project rules: TypeScript strict mode, Zod validation at edges, deterministic tests written before production code, no client-supplied owner IDs, no provider secrets in the browser, and no raw decision content in Sentry or PostHog telemetry.

## Goals / Non-Goals

**Goals:**

- Provide first-class signup and login using email and password.
- Provide first-class Google OAuth sign-in through the same app session interface.
- Ensure every auth form submission path is CSRF-safe under Auth.js, including credentials login, Google login, Google signup, and logout.
- Render expected auth failures as localized UI state, including field-level format errors and generic incorrect-credentials errors.
- Add clear localized navigation between login and signup.
- Render a localized logout control in authenticated app chrome.
- Establish server-readable sessions that include the authenticated user's canonical `userId`.
- Protect all decision and analysis features from unauthenticated access.
- Ensure every decision, analysis, dashboard, and memory query is scoped by `userId` from the session.
- Keep auth tests deterministic by mocking OAuth/provider boundaries and avoiding real network calls.

**Non-Goals:**

- Multi-tenant organizations, roles, sharing, admin permissions, or team membership.
- Password reset, email verification, magic links, MFA, or passkeys in the initial auth change.
- Automatic account linking between a Google identity and an existing credentials account when the user is not already authenticated.
- A hosted auth SaaS or a separate identity service.

## Decisions

### D1 - Use Auth.js v5 as the single auth boundary

Configure Auth.js in the App Router style with a root auth module exporting `auth`, `handlers`, `signIn`, and `signOut`, and route handlers under the Auth.js catch-all API route. Keep adapter-specific setup in the server-only auth module and keep any middleware-facing config edge-safe.

This matches the existing Next.js deployment model and gives Server Components, Server Actions, and Route Handlers a single session API. A custom auth stack was rejected because it would duplicate sensitive cookie, CSRF, provider, and session behavior.

### D2 - Use Google OAuth and Credentials providers behind one app session

Google OAuth handles users who prefer federated sign-in. Credentials handles email/password signup and login. Both providers normalize into the same application user identity and expose the same `session.user.id` contract to downstream code.

The Credentials provider will only verify existing users in `authorize`. Signup remains a separate server-side action/route that validates input, normalizes email, hashes the password, creates the user, and then starts a session. This keeps registration behavior testable and avoids mixing account creation into the login callback.

### D3 - Store credentials with a nullable password hash on the application user

Credentials users need a password hash. Add a nullable password-hash field to the user record, required for email/password login and absent for Google-only users. Passwords are never stored or logged in plaintext. Login compares the submitted password to the stored hash and returns a generic invalid-credentials result for all failures.

Alternative: store credentials in a separate table. That is cleaner for multiple local credentials per user, but unnecessary for this product's one-email-account model.

### D4 - Use Prisma adapter with JWT session strategy

Use the Prisma adapter for Auth.js user/account persistence and set `session.strategy = "jwt"`. The JWT session strategy is required for Credentials-provider sessions and works for Google sign-in as well. Auth callbacks must put the canonical user ID into the JWT and session object so server code can scope data access without another client-supplied identifier.

The adapter-compatible `Session` model can remain in the Prisma schema for compatibility/future migration, but runtime authorization must not depend on database session rows when JWT sessions are enabled.

### D5 - Do not silently link accounts by matching email

Auth.js intentionally does not automatically link OAuth accounts to an existing email when the user is not already signed in. Keep that conservative behavior. If a Google sign-in email collides with an existing unlinked credentials account, show a provider-conflict error and ask the user to use the original sign-in method. Explicit account linking can be a later authenticated flow.

For Google users, require the provider profile email to be verified before allowing sign-in. This prevents accepting an OAuth identity whose email ownership was not verified by Google.

### D6 - Gate access at both routing and data layers

Use route/layout/middleware protection for authenticated app areas so unauthenticated users reach the sign-in flow quickly. Also require each server action, route handler, and data-access helper to resolve the session and scope queries by `userId`. The data layer check is the final authority; route protection is not enough.

All decision and analysis code must derive ownership from `auth()`/session context. Client payloads must never include a trusted `userId`, `ownerId`, or account ID.

### D7 - Test auth behavior before implementation

Write tests before production code. Unit tests cover Zod schemas, password hashing/comparison wrappers, callback/session mapping, and generic error normalization. Integration tests cover signup, duplicate email handling, credentials login, Google callback behavior with mocked provider data, protected API access, and cross-user isolation. Playwright covers deterministic sign-in/sign-out and protected-route redirects with mocked Google.

No auth test should call real Google, send email, or depend on network access.

### D8 - Submit auth actions through Auth.js-supported CSRF-safe paths

Credentials login, Google login, Google signup, and logout must not post directly to Auth.js action endpoints without Auth.js CSRF state. Prefer form-bound Server Actions that call the exported Auth.js `signIn`/`signOut` helpers and handle `AuthError`, or a client component that calls `next-auth/react` `signIn` for client-managed flows. If any direct HTTP POST to an Auth.js action endpoint remains, it must include the Auth.js CSRF token and matching cookie.

Direct provider endpoint forms are simpler markup, but they bypass the CSRF contract and are the likely source of `MissingCSRF`. Server Actions also align with the existing App Router setup and keep provider secrets server-side.

### D9 - Model auth form failures as explicit UI state

Expected auth failures are not exceptions for users. Login and signup forms should use a typed action state shape that can carry `fieldErrors`, `formError`, and optional redirect targets. Invalid email format and missing password are field errors. Incorrect password, unknown email, and Google-only credentials attempts are the same generic form error. Duplicate signup email remains a field-level email error.

This keeps normal auth failures on the same localized page, preserves accessibility through `aria-invalid` and live error text, and avoids showing JSON responses or server stack details for routine validation failures.

### D10 - Treat Google signup as the same provider flow with signup-page entry

The signup page should expose a localized Google button in addition to credentials signup. It uses the same Google provider and callback behavior as login; the distinction is the entry point and copy, not a separate OAuth configuration. Login and signup pages should cross-link so users can recover from choosing the wrong entry point without losing locale context.

### D11 - Render logout in the authenticated app shell

Authenticated application pages should include a localized logout button in the app chrome, using the existing button conventions and logout action. The control should only render for authenticated users and should preserve the CSRF-safe logout path defined for Auth.js.

Keeping logout visible avoids trapping users in a session and gives Playwright a stable, user-facing way to verify sign-out rather than relying on direct route calls.

## Risks / Trade-offs

- Account-linking confusion for users who try Google after credentials signup -> Mitigation: return a clear provider-conflict state without disclosing sensitive account details; defer explicit linking to a later authenticated flow.
- Password auth increases attack surface -> Mitigation: validate inputs, hash passwords server-side, use generic login errors, avoid logging secrets, and keep provider secrets server-side only.
- JWT sessions cannot be revoked by deleting a database session row -> Mitigation: keep short, reasonable session lifetime and route all authorization through server-side session validation; add server-side revocation only if the product later needs it.
- Middleware edge runtime can conflict with Prisma-backed auth setup -> Mitigation: keep adapter access out of edge code and use an edge-safe Auth.js config split where middleware is used.
- Auth bugs can leak private decisions -> Mitigation: enforce `userId` scoping in every query and include cross-user isolation tests for each decision/analysis surface.
- Direct Auth.js endpoint posts can fail CSRF validation -> Mitigation: route credentials, Google, and logout submissions through Auth.js helpers or include a verified CSRF token/cookie pair; cover this with deterministic component/integration/e2e tests.
- Form validation can regress into JSON/error pages -> Mitigation: treat expected auth failures as return values consumed by the form UI and assert localized error rendering.

## Migration Plan

1. Add auth dependencies and environment variables: `AUTH_SECRET`, `AUTH_GOOGLE_ID`, and `AUTH_GOOGLE_SECRET`.
2. Extend the Prisma user schema with password-hash storage if it is not already present, then generate and apply a migration.
3. Add Auth.js configuration, provider setup, session callbacks, route handlers, and typed session helpers.
4. Add signup/login/logout UI and localized messages.
5. Replace direct Auth.js provider endpoint posts with CSRF-safe auth actions and add login/signup cross-links, Google signup controls, and a visible authenticated logout button.
6. Protect routes and update all decision/analysis data access to require session-derived `userId`.
7. Deploy additively. Rollback is redeploying the prior app version; the nullable password-hash column can remain safely unused.

## Open Questions

- Confirm the password hash implementation package and cost parameters during implementation.
- Decide whether password reset and explicit account linking should be separate follow-up changes.
