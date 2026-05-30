# PostHog — Core Business Dashboards

Reproducible definitions for the three core dashboards derived **solely** from the event
taxonomy (`lib/observability/capture.ts`). Every insight below depends only on event names
and the privacy-safe properties (ids, enums, counts, durations) — never on raw decision or
analysis content. Recreate the dashboards from these specs in any PostHog project that
receives the taxonomy events.

Taxonomy events used:

- `decision_created` — `has_reasoning`, `category?`
- `analysis_started` — `version`
- `analysis_ready` — `duration_ms`, `bias_count`, `complexity`
- `analysis_failed` — `reason_class`
- `analysis_retried` — `trigger` (`manual` | `stalled`)
- `reanalysis_run` — `prior_version`
- `dashboard_viewed`, `locale_switched` (`from`, `to`)

Stalled analyses are surfaced as Sentry `analysis_stalled` messages and as
`analysis_retried` with `trigger: "stalled"`; the reliability view below reads the
`stalled` retry trigger as the analytics-side stalled signal.

---

## 1. Activation funnel — signup → first decision → first ready analysis

- **Insight type:** Funnel (ordered, per-user, conversion window 7 days).
- **Steps:**
  1. `$identify` / user signed up — the user's first appearance (signup). If a dedicated
     `user_signed_up` event is later added, use it; until then use the first
     `decision_created` predecessor via PostHog's "first time" signup definition / the
     Auth.js sign-in event.
  2. `decision_created` (first occurrence per user).
  3. `analysis_ready` (first occurrence per user).
- **Breakdown (optional):** none required; keep prose-free.
- **Question answered:** what fraction of new users reach a first useful analysis, and
  where they drop off.

## 2. Reliability — ready vs failed vs stalled rates

- **Insight type:** Trends, line/stacked-bar, daily interval.
- **Series:**
  - A — total count of `analysis_ready`.
  - B — total count of `analysis_failed`.
  - C — total count of `analysis_failed` broken down by `reason_class`
    (`validation` vs `provider`).
  - D — count of `analysis_retried` where `trigger = stalled` (the stalled signal).
- **Derived ratios (formula insight):**
  - Success rate = A / (A + B).
  - Failure rate = B / (A + B), split by `reason_class`.
  - Stalled rate = D / `analysis_started`.
- **Question answered:** is the async pipeline healthy, and are failures validation- or
  provider-driven?

## 3. Time-to-ready latency — p50 / p95

- **Insight type:** Trends on `analysis_ready`, value = property numeric aggregation of
  `duration_ms`.
- **Series:**
  - p50 — `P50(duration_ms)` of `analysis_ready`.
  - p95 — `P95(duration_ms)` of `analysis_ready`.
- **Interval:** daily; optionally a single-number tile for the trailing 7 days.
- **Question answered:** how long users wait for a ready analysis, and whether the tail
  (p95) is regressing.

---

## Provisioning (task 6.4)

Create one dashboard named **"Decision Mirror — Core"** containing the three insights
above, in the PostHog project that holds `NEXT_PUBLIC_POSTHOG_KEY` / `POSTHOG_KEY`. After
deploying with the keys set, emit a decision end-to-end (capture → ready) and confirm each
tile populates. These definitions are intentionally property-only so the dashboard can be
rebuilt from this file alone.
