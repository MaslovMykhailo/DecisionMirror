## Context

Decision Mirror already has the core data model for user-owned `Decision` rows and
append-only `Analysis` rows with a `processing | ready | failed` status lifecycle. Auth
requirements also already establish that decision operations are protected and scoped only
by the session-derived `userId`.

The missing product slice is the capture workflow: a user-facing form, one shared input
contract, a create endpoint that persists both rows atomically enough for the current
Prisma boundary, and a non-blocking scheduling seam for future analysis work. Existing
service code has an injectable `triggerAnalysis` hook, but the hook currently belongs to
the synchronous service flow. This change moves the post-response concern to the route
boundary and keeps the agent itself out of scope.

## Goals / Non-Goals

**Goals:**

- Provide a localized authenticated create-decision form for `situation`, `decision`, and
  optional `reasoning`.
- Define one shared Zod schema that is reused by client/form code and server route or
  service validation.
- Persist a new `Decision` and version-1 `Analysis(status=processing)` for the
  authenticated user, ignoring any client-supplied owner identifiers.
- Return a successful create response without waiting for analysis work.
- Schedule a background hook from the route layer using Next.js `after()`, which uses the
  platform `waitUntil` primitive where available.

**Non-Goals:**

- Implementing `runAgent(decisionId)`.
- Importing or calling `runAgent(decisionId)` from the create route.
- Building the status polling UI, retry, re-analysis, history, detail, or dashboard flows.
- Changing the Prisma schema or adding dependencies.

## Decisions

1. Keep the schema shared and domain-owned.

   Place the decision input schema in a reusable module outside the route handler and UI
   component, then import it from both sides. This prevents client and server validation
   drift and keeps tests focused on one contract. Alternative considered: keep validation
   inline in the service and duplicate client checks. That is simpler short-term but makes
   form behavior and API behavior diverge easily.

2. Keep ownership resolution server-side.

   The create flow resolves the authenticated user on the server and writes only the
   session-derived `userId`. Client-supplied `userId`, `ownerId`, or similar fields remain
   ignored. This matches the authentication spec and protects the first private write path.
   Alternative considered: accept owner fields in the request and compare them against the
   session. That adds unnecessary attack surface and error cases.

3. Schedule analysis at the route boundary, not inside the persistence service.

   The service should return after persistence and expose enough data for the route to
   schedule follow-up work. The route handler can call `after()` around an injected
   background trigger, so the HTTP response is not coupled to the trigger duration. This
   matches Next.js route-handler support for `after()` and keeps the service deterministic
   in unit tests. Alternative considered: await `triggerAnalysis` inside the service. That
   makes the route simpler but can block submission and mixes persistence with runtime
   scheduling.

4. Leave the scheduled callback as an injection point for now.

   Because this change explicitly excludes `runAgent`, the create route should either use a
   no-op production scheduler or an injected test scheduler until the agent change lands.
   Tests should assert that the callback receives the created `decisionId` and that the
   response does not await it. Alternative considered: add a placeholder `runAgent` import
   or TODO call. That would blur this change's boundary and risk adding an accidental model
   path to deterministic tests.

## Risks / Trade-offs

- Post-response work is best-effort on serverless platforms -> Persisting
  `Analysis(status=processing)` first keeps the decision durable and leaves future status
  polling/retry work able to recover stalled analyses.
- Shared schema imported by client code can accidentally pull server-only modules ->
  Keep the schema module dependency-light and free of Prisma/session imports.
- Moving trigger scheduling out of the service changes existing service tests ->
  Update tests test-first to assert persistence separately from route-level scheduling.
- No real agent call means analyses remain `processing` after capture -> Treat that as an
  intentional temporary state for this change and make it visible in tasks.
