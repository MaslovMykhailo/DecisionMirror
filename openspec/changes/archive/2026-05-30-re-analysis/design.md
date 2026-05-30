## Context

Decision Mirror already models analyses as versioned rows with `processing`, `ready`, and
`failed` states. `runAgent(decisionId)` finds the newest processing analysis for the
decision, uses that analysis row as the checkpoint thread, and persists either ready output
or a retryable failure reason. History/detail read models already preserve the newest ready
analysis while a newer processing analysis is visible.

The missing pieces are the authenticated recovery/re-run entrypoints, a consistent
definition of stalled processing, and UI/read-model support for choosing between prior ready
versions. This change must keep all decision access scoped by session `userId`, keep model
providers stubbed in tests, and avoid sending raw decision content to telemetry.

## Goals / Non-Goals

**Goals:**

- Let an owner retry the newest failed or stalled analysis without creating a new version.
- Let an owner run a fresh re-analysis that appends the next `Analysis.version`.
- Surface stalled processing analyses as retryable without adding a new database status.
- Let the detail view switch between ready analysis versions, defaulting to the newest ready
  result as the current analysis.
- Preserve existing append-only history, locale handling, polling, and privacy boundaries.

**Non-Goals:**

- Changing the `AnalysisStatus` enum or adding a migration.
- Calling a real model from tests.
- Retrying or re-running analyses across users, by client-supplied owner IDs, or from
  unauthenticated requests.
- Making older ready versions editable or deleting historical analysis rows.

## Decisions

### Derive stalled state from `updatedAt`

Stalled processing is a read-time interpretation of a `processing` analysis whose
`updatedAt` is older than a named timeout threshold. The database status remains
`processing`; status/read-model payloads add `isStalled` and `retryable` metadata.

Alternatives considered:

- Add a `stalled` enum value. Rejected because it needs a migration and creates a second
  terminal-like state that still needs to retry as `processing`.
- Background-mark stalled rows as `failed`. Rejected because a timeout is an operational
  recovery signal, not necessarily a provider failure, and it would rewrite state without a
  user action.

### Retry reuses the same analysis row

Retry updates the newest retryable analysis row back to `processing`, clears
`failureReason`, preserves `version` and `locale`, and schedules `runAgent(decisionId)`.
For failed rows this resumes the same logical version. For stalled rows the update refreshes
`updatedAt`, which clears the derived stalled state and gives the pipeline a new chance to
resume via the existing checkpointer thread.

Alternatives considered:

- Retry by appending a new version. Rejected because re-analysis already covers fresh runs;
  retry should mean "try this failed/stalled version again."

### Re-analysis appends a new processing version

Re-analysis computes `max(version) + 1`, creates a new `processing` row using the selected
locale for that run, and schedules `runAgent(decisionId)`. Existing ready/failed rows remain
unchanged. If the newest analysis is actively processing and has not crossed the stalled
threshold, the action should avoid inserting a duplicate processing version and return a
conflict-style result for the UI.

Alternatives considered:

- Mutate the newest ready row back to `processing`. Rejected because the data model defines
  re-analysis as append-only and the UI should keep the previous ready result available.

### Use authenticated route handlers for mutations

Add POST route handlers alongside the existing decisions API:

- `POST /api/decisions/:decisionId/retry`
- `POST /api/decisions/:decisionId/reanalyze`

Both handlers delegate to `lib/decisions/service.ts`, pass the authenticated session user,
and schedule `runAgent` through the same `after()`/background trigger pattern used by
decision creation.

Alternatives considered:

- Client-only mutation logic. Rejected because ownership, state transitions, and provider
  scheduling must remain server-side.
- Server Actions only. Acceptable later, but route handlers match the existing create/status
  API pattern and are easy to cover with deterministic unit tests.

### Extend detail read models for ready versions

`getDecisionHistoryDetail` should return a `readyAnalyses` collection sorted by descending
version in addition to the default newest ready `readyAnalysis`. The client detail view
keeps local selected-version state; it renders the newest ready result by default, switches
only among ready versions, and keeps newest analysis status/polling independent from the
selected historical result.

Alternatives considered:

- Fetch historical versions lazily per selection. Rejected for now because analysis payloads
  are already loaded for the detail view and the expected number of versions is small.

## Risks / Trade-offs

- Multiple quick re-analysis clicks could race the next version calculation -> use a
  transaction or unique-constraint retry around `max(version) + 1`, and disable the action
  while a mutation is pending.
- A processing row may be marked stalled while the background job is still running slowly ->
  choose a conservative timeout and make retry a user action rather than automatic mutation.
- Retrying a stalled row can overlap with an in-flight job for the same analysis -> the
  checkpointer thread is per analysis row; the service should guard against active
  non-stalled processing and tests should cover duplicate trigger prevention.
- Returning all ready versions increases detail payload size -> keep the payload scoped to a
  single decision and revisit pagination only if version counts become large.

## Migration Plan

No database migration is expected. Deploy service/read-model changes first, then API routes,
then UI controls and localized messages. Rollback is a code rollback; existing analysis rows
remain valid because no stored data format changes.

## Open Questions

- The exact timeout value should be set as a named constant during implementation and can be
  tuned later from operational data.
