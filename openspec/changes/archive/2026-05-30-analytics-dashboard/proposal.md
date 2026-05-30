## Why

Users can capture and review individual decision analyses, but they do not yet have a
summary view that shows recurring decision categories or cognitive-bias patterns across
their completed analyses. A dashboard over ready analyses helps users understand their
decision history without exposing incomplete or cross-user data.

## What Changes

- Add server-side aggregation for category frequency across the authenticated user's
  ready analyses only.
- Add server-side aggregation for cognitive-bias frequency across the authenticated user's
  ready analyses only.
- Add dashboard charts for category frequency and bias frequency using Recharts and the
  existing design tokens.
- Add a dashboard empty state when the authenticated user has no ready analyses.

## Capabilities

### New Capabilities

- `analytics-dashboard`: User-scoped dashboard summaries for ready analysis category and
  cognitive-bias frequency, including chart rendering and empty-state behavior.

### Modified Capabilities

None.

## Impact

- Server-side read model or query module for dashboard aggregation.
- Authenticated dashboard route or existing dashboard surface.
- UI chart components using Recharts and token-based styling.
- Tests for user scoping, ready-analysis filtering, aggregation correctness, chart
  rendering, and empty-state behavior.
