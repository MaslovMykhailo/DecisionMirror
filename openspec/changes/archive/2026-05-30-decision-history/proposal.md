## Why

Users need a way to return to prior decisions and inspect analysis outcomes after the
initial capture flow completes. This change makes saved decisions discoverable, preserves
per-user privacy, and gives users clear feedback while analysis is still running or has
failed.

## What Changes

- Add an authenticated decision history list scoped to the session user.
- Show each saved decision with a short summary, category when available, and analysis
  status badge.
- Add a decision detail view that displays the original submitted input alongside the
  newest analysis result.
- Add client polling with backoff while any visible analysis is `processing`, stopping once
  all visible analyses are settled.
- Render explicit not-ready, failed, and empty states so users understand what is available
  and what needs attention.

## Capabilities

### New Capabilities

- `decision-history`: Covers authenticated decision list and detail views, user-scoped
  decision retrieval, settled and in-progress analysis rendering, polling behavior, and
  empty states.

### Modified Capabilities

None.

## Impact

- Affects authenticated application routes for decision listing and decision detail.
- Uses existing `Decision` and `Analysis` persistence models and the authenticated session
  `userId` for all reads.
- Uses the existing analysis status endpoint for polling and existing structured analysis
  fields for rendering ready analysis results.
- Adds or extends unit, integration, and UI tests for user-scoped queries, rendering states,
  and polling behavior without real model calls.
