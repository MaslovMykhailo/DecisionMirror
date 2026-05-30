## 1. Dependencies & shared privacy guard

- [x] 1.1 Add `@sentry/nextjs`, `posthog-js`, `posthog-node`, `langsmith` to `package.json`; install.
- [x] 1.2 Write failing tests for `lib/observability/scrub.ts` (allowlist of ids/enums/status/counts/durations; strips any other key; rejects free-form prose).
- [x] 1.3 Implement `lib/observability/scrub.ts` to green.
- [x] 1.4 Write failing tests for a typed `captureEvent(name, props)` wrapper that only accepts the taxonomy property shapes and is a no-op without a PostHog key.
- [x] 1.5 Implement the typed capture wrapper to green.

## 2. Sentry — multi-runtime error & performance capture

- [x] 2.1 Run `npx @sentry/wizard@latest -i nextjs --saas --org mykhailom-system --project decision-mirror` once; review and commit generated `instrumentation.ts`, `instrumentation-client.ts`, `sentry.server.config.ts`, `sentry.edge.config.ts`, and `withSentryConfig` wrapping in `next.config`.
- [x] 2.2 Write failing test: Sentry init is a no-op when `SENTRY_DSN` is absent (no events, no throw).
- [x] 2.3 Wire each runtime config to self-disable when DSN absent; green.
- [x] 2.4 Write failing test: a central `beforeSend` strips all non-allowlisted fields (reuses `scrub.ts`); decision/analysis prose never leaves.
- [x] 2.5 Implement `beforeSend` scrubbing across all runtime configs; green.
- [x] 2.6 Write failing test: events carry a release identifier derived from git SHA; configure release + source-map upload (document `SENTRY_AUTH_TOKEN`, skip-with-warning when absent).
- [x] 2.7 Implement release/source-map config; green.

## 3. Sentry — async-pipeline failure visibility

- [x] 3.1 Write failing test: `runAgent` failure capture includes `decisionId`, failing node name, and a failure class (validation vs provider/runtime).
- [x] 3.2 Wire capture into `runAgent`'s catch path and the `fail` node in `agent/`; green.
- [x] 3.3 Write failing test: an analysis stuck in `processing` past the timeout is reported as a distinct stalled signal (reusing `lib/decisions/analysis-retryability.ts`).
- [x] 3.4 Implement stalled-analysis reporting; green.

## 4. PostHog — integration & flush

- [x] 4.1 Write failing tests: server (`posthog-node`) capture identifies the authenticated user and is a no-op without a key.
- [x] 4.2 Implement server PostHog client (singleton) used by the capture wrapper; green.
- [x] 4.3 Write failing test: server events are flushed inside the `after()`/`waitUntil` window so they are not dropped on serverless teardown.
- [x] 4.4 Implement flush in the pipeline emission path; green.
- [x] 4.5 Add `posthog-js` provider to `app/[locale]/layout.tsx`; write a component test that init is a no-op without `NEXT_PUBLIC_POSTHOG_*`.

## 5. PostHog — business event taxonomy

- [x] 5.1 Write failing test: `decision_created` (`category?`, `has_reasoning`) emitted once on successful capture in `lib/decisions/service.ts`; reasoning reduced to boolean, no prose.
- [x] 5.2 Implement `decision_created` emission; green.
- [x] 5.3 Write failing tests: `analysis_started` (`version`) and `analysis_ready` (`duration_ms`, `bias_count`, `complexity`) emitted from the agent persist path; `duration_ms` from timestamps, counts/enums from validated output.
- [x] 5.4 Implement started/ready emission; green.
- [x] 5.5 Write failing test: `analysis_failed` (`reason_class`) emitted on the `failed` transition.
- [x] 5.6 Implement failed emission; green.
- [x] 5.7 Write failing tests: `analysis_retried` (`trigger: manual|stalled`) and `reanalysis_run` (`prior_version`) emitted from the service retry/re-analyze paths, once per occurrence.
- [x] 5.8 Implement retried/reanalysis emission; green.
- [x] 5.9 Write failing tests: `dashboard_viewed` on the analytics dashboard view, and `locale_switched` (`from`, `to`) on locale change.
- [x] 5.10 Implement dashboard_viewed and locale_switched emission; green.

## 6. PostHog — core business dashboards

- [x] 6.1 Capture reproducible definitions (in `openspec/changes/observability/` or a `posthog/` config doc) for the signup → first-decision → first-ready funnel.
- [x] 6.2 Capture the reliability dashboard definition (ready vs failed vs stalled rates) from taxonomy events.
- [x] 6.3 Capture the time-to-ready p50/p95 dashboard definition from `analysis_ready.duration_ms`.
- [ ] 6.4 Provision the three dashboards in PostHog and verify they populate from emitted events.

## 7. LangSmith — runAgent tracing

- [x] 7.1 Write failing test: with tracing disabled/unconfigured, `runAgent` emits no LangSmith traffic and runs normally.
- [x] 7.2 Confirm/enable env-driven auto-tracing (`LANGSMITH_TRACING`, `LANGSMITH_API_KEY`, `LANGSMITH_PROJECT`); ensure inert when off; green.
- [x] 7.3 Write failing test: per-run metadata includes token usage, latency, and recalled-memory references (by id), threaded via the existing `RunnableConfig`.
- [x] 7.4 Implement run metadata/tags in `agent/index.ts` + `load-memory`/`analyze` nodes; green.
- [x] 7.5 Write failing test: a context without the project/key (cron/headless) does not trace to a shared project.
- [x] 7.6 Implement the guard; green.
- [ ] 7.7 Set the LangSmith project scope and retention policy (console/config); document chosen retention + region.

## 8. Verification & docs

- [x] 8.1 Add an integration test asserting no decision/analysis prose reaches any sink (Sentry `beforeSend`, PostHog wrapper, LangSmith metadata) across the full pipeline.
- [ ] 8.2 Trigger a sample error (e.g. visit `/sentry-example-page` or call an undefined function) and confirm it appears in Sentry Issues.
- [x] 8.3 Update `.env.example` if any new public vars (`NEXT_PUBLIC_POSTHOG_*`, `SENTRY_AUTH_TOKEN`) are introduced.
- [x] 8.4 Note in `architecture/04-observability.md` that the layers are now implemented; resolve the design Open Questions (retention, stalled timeout, dashboard_viewed scope).
- [x] 8.5 Run the gate: `pnpm lint && pnpm typecheck && pnpm test`.

---

## Remaining external/manual steps (require live accounts — cannot be done offline)

- **6.4** — Create the "Decision Mirror — Core" dashboard in the PostHog project (the three
  insights are fully specified in [`posthog/dashboards.md`](../../../posthog/dashboards.md)),
  then emit a decision end-to-end and confirm the tiles populate.
- **7.7** — In the LangSmith console, set the project `decision-analysis` retention to
  **14 days**, region **US** (chosen values documented in `architecture/04-observability.md`).
- **8.2** — With a real `SENTRY_DSN` set, visit `/sentry-example-page`, trigger the error,
  and confirm it appears in Sentry → Issues (the page is implemented; only the live
  verification is outstanding).
