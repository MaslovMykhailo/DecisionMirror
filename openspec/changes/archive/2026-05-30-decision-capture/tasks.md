## 1. Shared Contract

- [x] 1.1 Add failing unit tests for the create-decision Zod schema covering required fields, optional `reasoning`, trimming, and blank trimmed required values
- [x] 1.2 Extract the create-decision input schema into a shared client-safe module with exported input types
- [x] 1.3 Update server validation to consume the shared schema without duplicating validation rules

## 2. Persistence Endpoint

- [x] 2.1 Add failing service and route tests for valid create, invalid payload, unauthenticated create, ignored client owner identifiers, and no persistence on failure
- [x] 2.2 Update the create service to persist a `Decision` and version-1 `Analysis(status=processing)` using only the session-derived `userId`
- [x] 2.3 Add or update Prisma-backed integration coverage proving the persisted decision owner and initial processing analysis row

## 3. Create-Decision Form

- [x] 3.1 Add failing component tests for required field errors, optional reasoning submission, trimmed payloads, and no network request on invalid input
- [x] 3.2 Build the authenticated create-decision form for `situation`, `decision`, and optional `reasoning` using the shared schema
- [x] 3.3 Render the form in the authenticated application surface with localized labels, pending state, error state, and success handling after create

## 4. Background Scheduling Seam

- [x] 4.1 Add failing route tests proving successful create schedules a background callback with the created `decisionId` and invalid or unauthenticated creates do not schedule work
- [x] 4.2 Move analysis scheduling to the route boundary using Next.js `after()` around an injected background trigger so the create response does not await the trigger duration
- [x] 4.3 Keep the production background trigger as a no-op or injectable seam for this change, and verify there is no `runAgent(decisionId)` import, implementation, or call

## 5. Verification

- [x] 5.1 Run `pnpm lint`, `pnpm typecheck`, and `pnpm test`
- [x] 5.2 Confirm no real model/provider call is reachable from unit, integration, component, or e2e tests
