## Why

The observability design (`architecture/04-observability.md`) is fully specified but
unimplemented: env vars exist in `.env.example`, yet no production code wires Sentry,
PostHog, or LangSmith. We are blind to whether the app breaks, whether users get value,
and whether the agent reasons well. The async analysis pipeline (`processing → ready /
failed`, retry, re-analyze) is exactly the surface where silent failures and stalls hide,
so we need all three lenses before relying on it.

## What Changes

- **Sentry** wired across the three Next.js runtimes (browser, server, edge) via the
  official wizard config (`@sentry/wizard -i nextjs`). Captures exceptions, unhandled
  rejections, and performance traces; release health tied to git SHA. `runAgent` failures,
  validation-vs-provider failure classes, and stalled-`processing` analyses become visible.
  PII discipline: IDs/enums/status only — never raw decision text.
- **PostHog** integrated server-side and client-side. Emit the business event taxonomy —
  `decision_created`, `analysis_started`, `analysis_ready`, `analysis_failed`,
  `analysis_retried`, `reanalysis_run`, `dashboard_viewed`, `locale_switched` — carrying
  IDs, enums, counts, and durations only, never raw decision text.
- **Core business dashboards** defined in PostHog from the taxonomy: the
  signup → first-decision → first-ready funnel; ready/failed/stalled reliability; and
  time-to-ready p50/p95.
- **LangSmith** tracing wired into `runAgent` with per-node I/O, token usage, latency, and
  recalled memories as run metadata. Project scoped and retention set; kept out of shared /
  cron contexts.
- New dependencies: `@sentry/nextjs`, `posthog-js`, `posthog-node`, `langsmith`.
- A privacy guard (shared scrubbing rule) ensures no decision/analysis prose reaches any of
  the three sinks.

## Capabilities

### New Capabilities

- `error-tracking`: Sentry across browser/server/edge runtimes — exception and performance
  capture, async-pipeline failure visibility, release health, and the PII-scrubbing
  discipline that keeps decision text out of error payloads.
- `product-analytics`: PostHog client/server integration, the business event taxonomy with
  privacy-safe properties, and the core business dashboards (funnel, reliability,
  time-to-ready) derived from those events.
- `agent-tracing`: LangSmith tracing for `runAgent` — per-node inputs/outputs, token usage,
  latency, recalled-memory metadata, project scoping, and retention.

### Modified Capabilities

<!-- No existing spec-level requirements change. The async pipeline and dashboard read
     models keep their contracts; this change only adds observability around them. -->

## Impact

- **Code**: `agent/index.ts` (`runAgent` tracing + failure capture), `agent/graph.ts` /
  `agent/nodes.ts` (per-node trace metadata), `lib/decisions/service.ts`,
  `lib/decisions/http.ts`, `lib/decisions/status-http.ts` (event emission + error capture),
  locale switching path, dashboard/history pages (`dashboard_viewed`), `app/[locale]/layout.tsx`
  (PostHog provider), new `instrumentation.ts` / `sentry.*.config.ts` from the wizard, new
  analytics + tracing helper modules under `lib/observability/`.
- **Config / build**: `next.config` wrapped with `withSentryConfig`; source-map upload at
  build; `instrumentation-client.ts`. New env vars consumed (`NEXT_PUBLIC_SENTRY_DSN`, `POSTHOG_KEY`,
  `NEXT_PUBLIC_POSTHOG_*`, `LANGSMITH_*`) — already present in `.env.example`.
- **Dependencies**: add `@sentry/nextjs`, `posthog-js`, `posthog-node`, `langsmith`.
- **External systems**: Sentry project `decision-mirror` (org `mykhailom-system`); PostHog
  project + dashboards; LangSmith project with retention policy.
- **Privacy**: shared scrubbing rule enforced across all three sinks (CLAUDE.md
  non-negotiable #5).
- **Tests**: all three SDKs mocked in unit/integration/e2e; deterministic, offline.
