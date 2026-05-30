## Context

Decision Mirror already stores append-only `Analysis` rows behind user-owned `Decision`
rows. Ready analyses carry a canonical `category` enum and a JSON `biases` array whose
items use the canonical cognitive-bias identifiers from `@/lib/taxonomy`. Decision history
read models already authenticate through `getAuthenticatedUserId`, scope reads by
`Decision.userId`, and avoid raw decision content in telemetry.

The dashboard should follow those same boundaries. It is a read-only summary surface over
completed analysis data: category frequency and cognitive-bias frequency for the current
user, plus an empty state when no ready analysis can contribute to the charts. The design
system already exposes `--color-chart-*` tokens in `app/globals.css`; `recharts` is not
currently listed in `package.json` and will need to be added for chart rendering.

## Goals / Non-Goals

**Goals:**

- Provide a server-side dashboard read model that returns category and bias frequency for
  the authenticated user.
- Count only analyses with `status = ready` and valid structured result fields.
- Keep all aggregation queries scoped through the owning decision's `userId`.
- Render category and bias charts with Recharts while consuming existing semantic and
  chart color tokens.
- Render an explicit empty state when both aggregations have no ready-analysis data.

**Non-Goals:**

- No new persisted summary tables, migrations, or background jobs.
- No raw decision text, analysis prose, or prompt content in dashboard telemetry.
- No real-time polling for dashboard charts.
- No change to agent output schemas, taxonomy identifiers, or analysis persistence.

## Decisions

1. Use a dedicated dashboard read model, for example `lib/analytics/dashboard.ts`.

   The read model should mirror the existing decision-history pattern: accept a `getUser`
   dependency and an optional database dependency for deterministic unit tests, return
   `{ status: "unauthenticated" }` for unauthenticated access, and return serializable chart
   rows for successful reads. This keeps UI code thin and lets tests verify scoping and
   aggregation without rendering React.

   Alternative considered: compute the dashboard from `getDecisionHistoryList`. That would
   reuse existing code, but it would fetch raw decision summaries and analysis sections that
   charts do not need. A dedicated read model keeps the privacy and performance surface
   smaller.

2. Perform aggregation in database-backed server queries.

   Category frequency can use Prisma `groupBy` or a typed raw query over `Analysis` joined
   to `Decision`. Bias frequency should use a database-side JSON expansion of the ready
   `biases` array, grouping by each `bias.id`. Both queries MUST join through `Decision`
   and filter by the authenticated `userId`.

   Alternative considered: fetch all ready analyses and aggregate in memory. That is simpler
   to code but does not meet the server-side aggregation requirement and scales poorly as
   ready analyses grow.

3. Normalize query results to canonical taxonomy order and labels at the edge.

   The server should return canonical identifiers and counts, sorted by descending count
   with a deterministic identifier tie-break. The UI should localize labels through the
   existing taxonomy label helpers and should not duplicate category or bias strings.

   Alternative considered: localize labels in the server read model. That would mix data
   access with presentation concerns and make the read model harder to test across locales.

4. Add a localized dashboard route and token-themed chart component.

   Add a route such as `app/[locale]/analytics/page.tsx`, a client component under
   `components/analytics/`, and a navigation affordance from the existing authenticated
   home header. Chart fills, strokes, grid lines, tooltip surfaces, and text colors should
   use CSS variables and Tailwind token utilities, including `--color-chart-*`.

   Alternative considered: place charts directly on the home capture page. A separate route
   keeps the first screen focused on creating a decision and avoids mixing capture with
   reporting.

## Risks / Trade-offs

- JSON aggregation depends on the persisted `biases` shape -> validate or ignore malformed
  entries in query mapping, and keep tests around the expected `{ id, explanation }` shape.
- Ready analyses can be absent even when decisions exist -> base empty-state logic on the
  aggregation result, not on the total decision count.
- Recharts is a client-side dependency -> keep the data fetch in the server route/read model
  and pass only small serialized arrays into client chart components.
- Historical re-analysis versions may affect counts -> document and test the selected row
  semantics during implementation so category and bias counts stay predictable.
