## Context

`architecture/04-observability.md` specifies three non-overlapping observability layers
(Sentry = "did it break?", PostHog = "are people getting value?", LangSmith = "did the agent
reason well?") but none are wired in production. Env vars already exist in `.env.example`
(`SENTRY_DSN`, `POSTHOG_KEY`, `LANGSMITH_*`); env access today is inline `process.env` with
no central config module. The async analysis pipeline (`agent/index.ts` `runAgent`, graph in
`agent/graph.ts`/`agent/nodes.ts`, scheduled via `after()` in `lib/decisions/http.ts`, status
in `lib/decisions/status-http.ts`) is the highest-risk surface. CLAUDE.md non-negotiable #5
forbids decision content in Sentry/PostHog; AGENTS.md requires the LLM (and now these SDKs)
to be mocked in all tests. Stack is Next.js 16 App Router on Vercel (serverless).

## Goals / Non-Goals

**Goals:**
- Initialize Sentry across browser/server/edge with PII scrubbing and release health.
- Make `runAgent` failures, failure classes, and stalled `processing` analyses visible.
- Emit the full PostHog business taxonomy at the correct call sites, prose-free.
- Define the three core business dashboards reproducibly from taxonomy events.
- Trace `runAgent` to LangSmith with per-node I/O, tokens, and recalled-memory metadata,
  scoped to a project with retention.
- Keep every SDK inert and offline under tests; all wiring covered test-first.

**Non-Goals:**
- No change to existing pipeline, dashboard, or agent *contracts* (no spec deltas).
- No durable queue / cron sweeper for stalled analyses — we *detect and report* stalls here,
  remediation is a separate change.
- No LLM-as-judge evals (that lives in the testing/eval workflow, out of the TDD loop).
- No new user-facing UI beyond a `dashboard_viewed`/`locale_switched` emission hook.

## Decisions

**Sentry via the official wizard config, hand-committed.** Use `@sentry/nextjs` with the
standard `instrumentation.ts` + `instrumentation-client.ts` + `sentry.server/edge.config.ts`
layout and `withSentryConfig` in `next.config`. Rationale: the wizard layout is the supported
path for the three-runtime model and source-map upload. Alternative (manual `Sentry.init`
scattered per entry) rejected — drifts from upstream and misses edge. We run the wizard once
to generate files, then keep them under version control and edit by hand so changes are
reviewable/testable.

**Central PII scrubbing in `beforeSend` + a tiny allowlist helper.** A shared
`lib/observability/scrub.ts` defines the allowed property shape (ids, enums, status, counts,
durations); Sentry's `beforeSend` strips anything else, and PostHog capture goes through a
typed `captureEvent(name, props)` wrapper that only accepts the taxonomy's property types.
Rationale: enforce non-negotiable #5 in one place rather than trusting every call site.

**PostHog: `posthog-node` server-side as the source of truth for pipeline events, `posthog-js`
for view/locale events.** Pipeline lifecycle (`analysis_started/ready/failed/retried`,
`reanalysis_run`, `decision_created`) is emitted server-side from `lib/decisions/service.ts`
and the agent, because those transitions happen in `after()`/server code where the client
isn't present. `dashboard_viewed` and `locale_switched` are client/server-component emissions.
Server captures are flushed via `posthog.flush()` inside the `after()`/`waitUntil` window so
serverless teardown doesn't drop them. Alternative (client-only capture) rejected: it can't
see background pipeline transitions.

**Event emission lives in the service/agent layer, not the HTTP handlers.** `decision_created`
and the analysis lifecycle events are emitted where the state transition is decided
(`lib/decisions/service.ts`, `agent` persist/fail nodes), so emission stays correct
regardless of which entrypoint (API route, retry, re-analyze) triggered it. `duration_ms`
comes from the analysis timestamps; `bias_count`/`complexity` from the validated analysis
output enums.

**LangSmith via env-driven auto-tracing + explicit run metadata.** `@langchain/*` traces
automatically when `LANGSMITH_TRACING=true` and an API key are set; we set
`LANGSMITH_PROJECT` and pass per-run `metadata`/`tags` (decisionId, version, recalled-memory
ids, token usage) through the existing `RunnableConfig` already threaded into the provider.
Rationale: reuse the native LangGraph integration rather than wrapping nodes manually.
Recalled memories are recorded by id/reference in metadata; node I/O the trace already
captures. Retention is set on the project (config/console, documented in tasks).

**No central env module introduced now.** Keep inline `process.env` reads consistent with the
codebase; each integration self-disables when its key is absent. A central env validator is
attractive but out of scope and would touch unrelated modules.

**Stalled detection.** A `processing` analysis older than the configured timeout is reported
as a distinct signal (separate Sentry message + `trigger: "stalled"` on `analysis_retried`
when a retry fires). Detection reuses the existing retryability logic in
`lib/decisions/analysis-retryability.ts`; this change adds the reporting, not a new sweeper.

## Risks / Trade-offs

- [Serverless drops async events/traces when the invocation ends before flush] → emit and
  flush PostHog inside the `after()`/`waitUntil` window; rely on LangSmith's background
  batching being awaited via the run config; cover the flush path in an integration test.
- [PII leak into Sentry/PostHog/LangSmith] → single scrub hook + typed capture wrapper +
  tests asserting no prose leaves; LangSmith necessarily sees trace inputs, mitigated by
  project scoping + retention + keeping it out of shared/cron contexts (per architecture doc).
- [Three SDKs slow or flake the test suite] → all mocked; integration tests assert "no
  network when key absent"; SDKs are no-ops without config.
- [Wizard regenerates/overwrites committed config or bloats `next.config`] → run wizard once,
  review the diff, commit, and treat files as hand-maintained thereafter.
- [Double-counting events across retry/re-analyze entrypoints] → emit at the single
  state-transition site in the service/agent layer, not per HTTP route; assert once-per-occurrence in tests.
- [Source-map upload needs an auth token in CI] → document `SENTRY_AUTH_TOKEN` as a build
  secret; upload is skipped (warn, not fail) when the token is absent locally.

## Migration Plan

1. Add deps (`@sentry/nextjs`, `posthog-js`, `posthog-node`, `langsmith`); run the Sentry
   wizard once, review and commit generated files.
2. Land scrubbing helper + typed capture wrapper (test-first) before any emission.
3. Wire Sentry init + `beforeSend`; wire PostHog server/client; wire LangSmith metadata.
4. Add emission at service/agent transition points and view/locale points.
5. Provision external resources: Sentry project `decision-mirror` (org `mykhailom-system`),
   PostHog dashboards, LangSmith project + retention.
6. Rollback: each integration self-disables by unsetting its key/DSN; no schema or contract
   changes, so rollback is config-only.

## Open Questions

- LangSmith retention duration and region (EU vs US) — pick to match the PostHog EU/GDPR
  posture noted in the architecture doc.
- Stalled-analysis timeout value — reuse the existing retryability threshold or set an
  explicit observability timeout?
- Should `dashboard_viewed` fire on the user analytics page only, or also the decision
  history page? (Taxonomy lists one event; default to the analytics dashboard.)
