## Why

The analytics dashboard currently aggregates over **every** `ready` analysis, so a decision
re-analyzed three times contributes three times to category and bias frequencies. That
over-weights decisions the user revisited and distorts the patterns the dashboard is meant
to surface. Users need to see patterns across their *distinct decisions* by default, while
still being able to inspect the full re-analysis history when they want it.

## What Changes

- Add a **mode toggle** to the analytics dashboard with two modes:
  - **Latest (default)**: aggregate only the newest `ready` analysis per decision (one row
    per decision).
  - **All versions**: aggregate every `ready` analysis across all versions (current
    behavior).
- The dashboard read model accepts a `mode` parameter and runs the corresponding optimal
  aggregation query. Latest mode uses `DISTINCT ON (decisionId)` ordered by `version DESC`,
  served by the existing `(decisionId, version)` unique index — no new index or extra query
  round-trips.
- The mode is driven by a URL search param (`?mode=latest|all`) so the server component
  fetches the correct dataset, the view is shareable/bookmarkable, and refresh preserves it.
- Emit a privacy-safe telemetry event when the user switches mode (enum mode value only — no
  decision content).

## Capabilities

### New Capabilities
<!-- none -->

### Modified Capabilities
- `analytics-dashboard`: the user-scoped aggregation requirement gains a `mode` parameter and
  latest-only semantics; a new requirement covers the mode toggle surface and its default.
- `product-analytics`: add a dashboard mode-change event to the privacy-safe client event
  catalog.

## Impact

- `lib/analytics/dashboard.ts` — `getAnalyticsDashboard` gains a `mode` arg and a second query
  variant.
- `app/[locale]/analytics/page.tsx` — reads `mode` from `searchParams` and passes it through.
- `components/analytics/dashboard-view.tsx` — renders the mode toggle.
- New client toggle component + `lib/observability/capture*.ts` event type.
- `messages/en.json`, `messages/uk.json` — toggle labels.
- No Prisma schema/migration change (existing unique index is sufficient).
- Tests: `tests/unit/analytics/dashboard-read-model.test.ts`, dashboard view/page tests,
  observability event tests.
