## Why

Failed or stalled analyses currently leave users without a direct recovery path, and fresh
re-analysis is not exposed as a first-class workflow. This change makes analysis recovery
and versioned re-runs explicit while preserving prior ready results as usable history.

## What Changes

- Add a retry action for failed analyses that marks the failed analysis `processing` again
  and re-triggers `runAgent(decisionId)` for the same analysis version.
- Treat processing analyses that exceed a configured timeout threshold as stalled and
  retryable in status responses and user-facing history/detail states.
- Add a re-analysis action that appends a new `Analysis` version for the decision and runs
  the agent pipeline for that new version.
- Add a detail-view analysis version switcher so users can inspect prior ready versions
  while the current displayed analysis remains the newest `ready` version.
- Preserve privacy and ownership rules: all retry, re-analysis, status, and detail queries
  are scoped to the authenticated session user's `userId`, and telemetry excludes raw
  decision and analysis content.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `agentic-analysis`: Add authenticated retry/re-analysis behavior, stalled processing
  detection, and status metadata needed to represent retryability without exposing private
  decision content.
- `decision-history`: Add retryable failed/stalled states, a re-analysis trigger from the
  detail workflow, and version switching for ready analysis versions.

## Impact

- Agent entrypoint usage: `runAgent(decisionId)` must be invoked for retry and re-analysis
  flows using the correct processing analysis row.
- Data access: decision and analysis mutations must remain scoped by authenticated `userId`.
- API/actions: authenticated retry and re-analysis mutations plus status payload fields for
  stalled/retryable state.
- UI: history/detail state rendering, detail actions, client polling transitions, and ready
  analysis version selection.
- Tests: unit/integration coverage for retryability decisions, append-only version creation,
  `runAgent` triggering, user isolation, and detail version selection.
