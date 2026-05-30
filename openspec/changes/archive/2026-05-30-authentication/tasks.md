## 1. Contracts and Dependencies

- [x] 1.1 Add failing unit tests for signup/login Zod validation, email normalization, duplicate-email error mapping, and generic invalid-credentials error mapping
- [x] 1.2 Add failing unit tests for password hash and password-compare helpers, including plaintext password non-persistence expectations
- [x] 1.3 Add Auth.js, Prisma adapter, Google provider, and password-hashing dependencies; update `.env.example` for `AUTH_SECRET`, `AUTH_GOOGLE_ID`, and `AUTH_GOOGLE_SECRET`
- [x] 1.4 Implement auth validation schemas and password helper utilities with no plaintext password logging
- [x] 1.5 Verify the existing Prisma user schema supports nullable password-hash storage and generate/apply any required migration if it does not

## 2. Auth.js Configuration

- [x] 2.1 Add failing unit tests for Auth.js JWT/session callbacks that require `session.user.id` to equal the canonical user ID
- [x] 2.2 Add failing tests for Google sign-in callback behavior: verified email allowed, unverified email denied, existing unlinked email denied
- [x] 2.3 Implement server-only Auth.js configuration with Prisma adapter, Google provider, Credentials provider, JWT session strategy, and typed `auth`, `signIn`, and `signOut` exports
- [x] 2.4 Implement the Auth.js catch-all route handler and an edge-safe config split for any middleware usage
- [x] 2.5 Add session helper utilities that return the authenticated user ID or a typed unauthenticated result for server code

## 3. Email and Password Flows

- [x] 3.1 Add failing integration tests for successful signup, duplicate signup email, invalid signup input, and automatic session establishment after signup
- [x] 3.2 Implement signup server action or route handler with server-side validation, normalized email, secure password hashing, duplicate-email handling, and redirect/session behavior
- [x] 3.3 Add failing integration tests for successful credentials login, incorrect password, unknown email, and Google-only user credentials login
- [x] 3.4 Implement Credentials-provider authorization using the shared validation schema, stored password hash comparison, and generic invalid-credentials errors
- [x] 3.5 Add failing tests for logout ending access to protected pages and APIs, then implement logout handling

## 4. Google OAuth Flow

- [x] 4.1 Add failing integration tests with mocked Google/Auth.js provider data for first-time Google sign-in and returning Google sign-in
- [x] 4.2 Add failing integration tests for unverified Google email and existing unlinked credentials email conflict
- [x] 4.3 Implement Google provider configuration, verified-email enforcement, conservative account-linking behavior, and provider-conflict error handling
- [x] 4.4 Ensure Google OAuth client secrets are read only server-side and are not exposed through client bundles, messages, telemetry, or test fixtures

## 5. Protected Access and User Isolation

- [x] 5.1 Add failing integration tests for unauthenticated access to protected route handlers and server actions
- [x] 5.2 Add failing integration tests proving decision creation uses the session-derived `userId` and ignores client-supplied owner identifiers
- [x] 5.3 Add failing integration tests for cross-user decision read, retry, re-analysis, dashboard aggregation, and memory recall denial/scoping
- [x] 5.4 Implement route/layout/middleware protection for authenticated application areas while leaving signup and login pages public
- [x] 5.5 Update decision, analysis, dashboard, and memory data-access helpers to require session-derived `userId` scoping at the query boundary

## 6. UI, Localization, and E2E

- [x] 6.1 Add failing component tests for localized signup/login forms, field-level validation errors, generic login errors, and provider-conflict errors
- [x] 6.2 Implement signup, login, logout, and auth error UI using existing shadcn/ui conventions and `next-intl` messages in English and Ukrainian
- [x] 6.3 Add deterministic Playwright tests for credentials signup/login/logout, mocked Google sign-in, protected-route redirect, and authenticated app access
- [x] 6.4 Verify auth UI works in both locales and does not expose secret values or raw decision content in telemetry payloads

## 7. Verification

- [x] 7.1 Run `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm test:integration`
- [x] 7.2 Run the deterministic Playwright auth flow after the app can boot locally
- [x] 7.3 Run `openspec validate authentication --strict` and resolve any proposal/spec/task issues

## 8. Auth CSRF and UX Remediation

- [x] 8.1 Add failing component tests for localized login-to-signup and signup-to-login links, preserving the active locale in each link target
- [x] 8.2 Add failing component tests for the signup page Google provider button and the login page Google provider button using CSRF-safe action wiring rather than direct provider endpoint posting
- [x] 8.3 Add failing tests for login validation UI: invalid email format, missing password, incorrect password, unknown email, and Google-only credentials login render localized field/form errors instead of raw JSON or unhandled errors
- [x] 8.4 Add failing component or Playwright coverage proving authenticated app pages render a localized logout button for signed-in users
- [x] 8.5 Add failing integration or Playwright coverage proving credentials login, Google login, Google signup, and logout do not produce Auth.js `MissingCSRF`
- [x] 8.6 Refactor credentials login, Google login, Google signup, and logout submissions to use Auth.js-supported CSRF-safe `signIn`/`signOut` paths or include a verified Auth.js CSRF token/cookie pair
- [x] 8.7 Implement localized auth-page cross-links, a Google sign-up button, and an authenticated app logout button using existing shadcn/ui conventions and accessible labels
- [x] 8.8 Normalize expected auth failures into typed form state with `fieldErrors`, `formError`, `aria-invalid`, and localized messages for both English and Ukrainian
- [x] 8.9 Run `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm test:integration`, the deterministic auth Playwright flow, and `openspec validate authentication --strict`
