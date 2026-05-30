## Context

Decision history already exposes an authenticated, user-scoped list that shows each
decision summary, newest analysis status, and the category from the newest ready analysis.
The analysis result already stores the structured fields needed for complexity and bias
filtering, and the canonical category/bias taxonomies already exist in `lib/taxonomy.ts`.

The missing behavior is list-level narrowing and ordering. The implementation must keep
all data access scoped to the session user, avoid raw decision content in telemetry, and
stay deterministic enough to test without an LLM.

## Goals / Non-Goals

**Goals:**

- Compute derived complexity from the newest ready analysis without adding an LLM field.
- Filter the history list by ready analysis category and by presence of a selected bias.
- Sort by creation time and by derived complexity, placing decisions with no ready analysis
  last for complexity sorts.
- Represent filter/sort state in URL query parameters so server-rendered results are
  shareable and refresh-safe.
- Reuse canonical taxonomy schemas and localized taxonomy labels.

**Non-Goals:**

- No database schema migration or stored complexity column.
- No dashboard aggregation changes.
- No filtering against older analysis versions unless that version is the newest ready
  analysis for the decision.
- No full-text search over private decision content.

## Decisions

### D1 - Complexity is a pure read-model derivation

Add a small deterministic helper in the decision history domain/read-model layer:
`complexity = biases.length + premortemRisks.length + missedAlternatives.length`.
The helper accepts the parsed newest ready analysis result and returns a number, or `null`
when no ready result exists.

Alternatives considered: persisting complexity on `Analysis` or asking the LLM for a score.
Persisting duplicates derivable state and requires migration/backfill. LLM scoring is less
stable, harder to explain, and adds prompt/schema surface.

### D2 - Filters and sorting are applied after a user-scoped fetch

Keep the existing first boundary as `where: { userId: session.userId }`. Fetch the list
rows and newest analysis fields needed to parse the newest ready result, then apply category
filter, bias filter, and sorting in TypeScript.

Alternatives considered: pushing all filters into Prisma/PostgreSQL. That can be optimized
later, but JSON array shape for bias presence and "newest ready analysis" semantics make a
pure SQL version more fragile for this demo. The user-scoped fetch preserves privacy, and
tests can assert no cross-user data is requested.

### D3 - Query params are the contract between controls and list data

The decisions page accepts `category`, `bias`, and `sort` search params. A Zod-backed parser
validates them against canonical taxonomies and a fixed sort enum. Invalid values fall back
to the unfiltered/default sort state rather than throwing.

The client list controls render localized category/bias labels and update the locale-aware
route query string. The page passes parsed options to `getDecisionHistoryList`, and the
component receives the applied filter/sort state so control UI matches the rendered list.

Alternatives considered: entirely client-side filtering of the already-rendered list. That
would be simpler for a tiny dataset, but URL state and server-rendered empty/filter states
are better for refreshes and e2e assertions.

### D4 - Sorting is stable and explicit

Creation-time sort uses `createdAt` with a default newest-first order. Complexity sort
orders ready decisions by complexity and places decisions without a newest ready analysis
last. Ties use `createdAt` descending, then `id`, so results are deterministic.

Alternatives considered: hiding no-ready decisions during complexity sorting. Keeping them
visible is more consistent with the existing history behavior and preserves processing,
failed, and stalled status visibility.

## Risks / Trade-offs

- Fetching all user decisions before filtering could become inefficient for large histories
  -> Accept for the initial product; the read-model API keeps the optimization boundary
  local if later pushed into SQL.
- Invalid query params could create confusing empty results -> Parse and normalize params,
  falling back to defaults for unknown taxonomy/sort values.
- New controls could accidentally expose private decision text in telemetry -> Do not add
  telemetry with raw summaries or decision content; only taxonomy IDs, sort IDs, counts, or
  durations are allowed if telemetry is later added.
- Status polling can update newest status while derived category/complexity stays stale
  until refresh -> Existing ready-transition behavior refreshes server-rendered data; the
  complexity/filter state updates on that same refresh.

## Migration Plan

No database migration is required. Implement test-first in the read model, page boundary,
and list component. Rollback is removing the query-param parser and controls while keeping
the existing unfiltered history list behavior.

## Open Questions

- None.
