## Why

Users need a protected way to capture a decision before analysis exists, so the product can
persist private journal input immediately and show progress while reflection runs later.

## What Changes

- Add an authenticated create-decision form that captures `situation`, `decision`, and
  optional `reasoning`.
- Reuse one Zod input contract for client-side form validation and server-side request
  validation.
- Create a decision submission endpoint that stores a `Decision` and initial
  `Analysis(status=processing)` row scoped to the session user.
- Schedule analysis after the response via the existing background-execution seam, without
  blocking form submission.
- Defer the actual `runAgent(decisionId)` implementation and invocation in this change.

## Capabilities

### New Capabilities

- `decision-capture`: Protected decision creation workflow, shared validation contract,
  persistence of the initial processing analysis, and non-blocking analysis scheduling seam.

### Modified Capabilities

None.

## Impact

- Affected UI: authenticated app page or component that renders the create-decision form.
- Affected API: `POST /api/decisions` request validation, response shape, persistence, and
  background scheduling seam.
- Affected server modules: shared decision input schema, decision service, route handler,
  and tests for validation, user scoping, and non-blocking trigger behavior.
- No new external dependencies are expected.
