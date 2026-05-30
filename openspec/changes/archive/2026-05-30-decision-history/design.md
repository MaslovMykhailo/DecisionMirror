## Context

Decision Mirror already persists user-owned `Decision` rows and append-only `Analysis`
versions. The create flow stores a version-1 `processing` analysis, the agent later marks
that analysis `ready` or `failed`, and `GET /api/decisions/:id/status` returns the newest
analysis status for an authenticated owner. The authenticated home page currently focuses
on capture only, so users cannot yet browse saved decisions or inspect completed analysis
results.

This change adds user-facing history and detail surfaces without changing the data model or
agent boundary. All reads remain scoped to the session-derived `userId`, and tests must use
deterministic fixtures or stubs rather than real model calls.

## Goals / Non-Goals

**Goals:**

- Provide an authenticated list of the current user's decisions with summary, category, and
  newest analysis status.
- Provide an authenticated detail view that shows original decision input beside the newest
  ready analysis result when available.
- Poll the existing status endpoint from the client while visible analyses are
  `processing`, using backoff and stopping once every visible analysis is settled.
- Render clear empty, processing/not-ready, failed, and ready states in both list and detail
  views.
- Preserve per-user isolation and deterministic tests.

**Non-Goals:**

- No schema migration or new analysis status values.
- No retry, re-analysis, filtering, search, pagination, dashboard, or memory recall UI.
- No new queue, worker, or model-provider behavior.
- No changes to the LLM output contract.

## Decisions

### Server-side list and detail read models

Add focused decision read helpers under `lib/decisions/` for list and detail view models.
They should resolve the authenticated user first, query only rows owned by that `userId`,
and return presentation-ready data shaped for the app routes. List rows should include a
trimmed summary from the decision input, the newest analysis status, and the category from
the newest ready analysis when one exists. Detail data should include the original
`situation`, `decision`, optional `reasoning`, newest analysis status, newest failure
reason when failed, and the newest ready structured result when available.

Alternative considered: query Prisma directly in route components. Keeping query logic in
`lib/decisions/` follows the existing service style and makes user scoping easy to unit
test without rendering the app.

### App Router pages for history and detail

Add localized authenticated routes for the history list and decision detail. Server
components should perform the initial user-scoped read so the first render contains the
latest persisted state. Client components should be limited to polling and local status
updates.

Alternative considered: make the whole history UI client-rendered. Server rendering keeps
private reads on the server, reduces loading states, and matches the current protected
application flow.

### Poll newest analysis status only

Reuse `GET /api/decisions/:id/status` for polling. The client poller should update only the
status-oriented fields returned by that endpoint and stop polling a decision once the
newest status becomes `ready` or `failed`. If a detail view already has an older ready
result and a newer analysis is processing, it should continue displaying the older ready
result while also showing that a newer analysis is still processing.

Alternative considered: add a richer polling endpoint that returns the full analysis
result. That can wait until there is a concrete need; a status-only endpoint already exists
and keeps polling payloads small.

### Localized state labels and badges

Add localized message keys for status badges, empty states, not-ready copy, and failed
analysis explanations in both supported locales. Badge styling should be shared or
centralized enough that list and detail use the same status vocabulary.

Alternative considered: hard-code labels in components. That would bypass the existing
next-intl message parity guarantees.

## Risks / Trade-offs

- Status polling can create noisy request patterns -> use exponential backoff with a capped
  delay and stop per decision as soon as the newest analysis is settled.
- A status response can become `ready` while the page still has stale server-rendered
  analysis content -> update the badge immediately and trigger a route refresh or equivalent
  data refresh when a visible decision transitions to `ready`.
- Showing previous ready output during re-analysis can be ambiguous -> make the newest
  status visually separate from the displayed ready result.
- Cross-user reads are high-risk privacy boundaries -> cover list, detail, and status usage
  with tests that prove queries include the session `userId` and deny missing rows.
