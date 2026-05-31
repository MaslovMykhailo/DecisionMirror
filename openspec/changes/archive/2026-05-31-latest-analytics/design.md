## Context

`getAnalyticsDashboard` (in `lib/analytics/dashboard.ts`) runs two `$queryRaw` aggregations
over `Analysis` joined to `Decision`, filtered to `status = 'ready'` and scoped by `userId`.
Both queries count over *all* ready analyses. Because re-analysis is append-only (a new
`Analysis` row with an incremented `version`; see `data-model` / Prisma `@@unique([decisionId,
version])`), a decision analyzed N times contributes N times to the frequencies.

The page (`app/[locale]/analytics/page.tsx`) is an async Server Component that calls the read
model directly and passes the result to `AnalyticsDashboardView`. Charts are a Client
Component (Recharts). No mode concept exists today.

## Goals / Non-Goals

**Goals:**
- Add a Latest (default) vs All-versions mode to the dashboard.
- Latest mode aggregates exactly one analysis per decision: the newest `ready` version.
- Keep both query variants optimal — no new index, no per-decision N+1, no full-history scan
  in latest mode beyond what the existing index already supports.
- Preserve per-user isolation and the no-prose-leak telemetry rule.

**Non-Goals:**
- No date-range / per-category filtering (out of scope).
- No Prisma schema or migration changes.
- No change to how analyses are created or versioned.

## Decisions

### Decision: Mode is a URL search param, resolved server-side
The page reads `mode` from `searchParams` (`latest` default, `all` opt-in) and passes it to
`getAnalyticsDashboard`. The toggle is a small Client Component that navigates to the same
route with the updated `?mode=` param.

- **Why**: data is fetched in a Server Component; URL-driven mode keeps a single source of
  truth, makes the view shareable/bookmarkable, survives refresh, and avoids shipping both
  datasets to the client or adding a client fetch.
- **Alternatives**: (a) client-only `useState` + fetch both datasets — doubles query cost and
  duplicates aggregation logic client-side; (b) a route handler returning JSON — extra
  endpoint for no benefit since the page already fetches server-side. Rejected.
- Unknown/invalid `mode` values fall back to `latest` (the default).

### Decision: Latest mode uses `DISTINCT ON (decisionId)` over a `ready`-filtered set
```sql
WITH latest AS (
  SELECT DISTINCT ON (a."decisionId")
    a."id", a."category", a."biases"
  FROM "Analysis" a
  INNER JOIN "Decision" d ON d."id" = a."decisionId"
  WHERE d."userId" = $1 AND a."status" = 'ready'::"AnalysisStatus"
  ORDER BY a."decisionId", a."version" DESC
)
-- then aggregate category / unnested biases over `latest`
```
- **Why**: `DISTINCT ON (decisionId) ... ORDER BY decisionId, version DESC` is served directly
  by the existing `@@unique([decisionId, version])` btree index, picking the highest ready
  version per decision in one pass. No new index, no correlated subquery, no extra round-trip.
- Filtering `status = 'ready'` *before* `DISTINCT ON` guarantees the latest *ready* version is
  chosen (a newer `processing`/`failed` row never shadows the last good analysis) — matching
  the "current analysis is the newest ready version" model invariant.
- **Alternatives**: window function `ROW_NUMBER() OVER (PARTITION BY decisionId ORDER BY
  version DESC)` then `WHERE rn = 1` — equivalent results but `DISTINCT ON` is terser and the
  planner uses the same index scan. Correlated `MAX(version)` subquery — slower, rejected.

### Decision: All-versions mode keeps the current queries verbatim
The existing category and bias aggregations remain unchanged for `mode = all`, so current
behavior is preserved exactly and the existing tests for that path stay green.

### Decision: Telemetry — `dashboard_mode_changed` with an enum `mode` only
Reuse the existing `captureClientEvent` catalog; add `dashboard_mode_changed` with property
`mode: 'latest' | 'all'`. No decision content, IDs, or counts — satisfies the no-prose-leak
rule and the product-analytics taxonomy.

## Risks / Trade-offs

- **Two query shapes to maintain** → keep the category/bias projection identical between modes;
  only the row-source (`Analysis` directly vs the `latest` CTE) differs. Shared row-mapping
  helpers already exist (`categoryFrequencyFromRows`, `biasFrequencyFromRows`).
- **`DISTINCT ON` index reliance** → covered by the existing unique index; assert query shape
  in unit tests (mocked `$queryRaw`) so a regression that drops `DISTINCT ON`/`ORDER BY` is
  caught. Real DB performance is unchanged (no schema change).
- **Default behavior change** → the default mode (latest) changes the numbers users see vs
  today's all-versions counts. This is the intended correction; the All-versions toggle keeps
  the old view one click away.
- **Empty-state parity** → `isEmpty` must be computed per mode; latest mode can be empty while
  all-versions is not is impossible (latest ⊆ all), but the reverse matters and is handled by
  computing emptiness from the returned rows in each mode.
