# 04 — Observability

Three complementary layers, each answering a different question. No single tool covers all
three, and the overlaps are deliberately avoided.

```
   "Did it break?"            "Are people getting value?"      "Did the agent reason well?"
   ┌──────────────┐           ┌──────────────────────┐         ┌──────────────────────┐
   │    Sentry    │           │       PostHog        │         │      LangSmith       │
   │ errors/perf  │           │ product + business   │         │ agent run traces     │
   └──────────────┘           └──────────────────────┘         └──────────────────────┘
   client+server+edge         funnels, retention, flags        per-node I/O, latency, evals
```

---

## Production monitoring — Sentry

- **Sentry** SDK across all three Next.js runtimes (browser, server, edge). Captures
  exceptions, unhandled rejections, and performance traces.
- Source maps uploaded at build so stack traces map to TS source.
- **Release health** tied to git SHA / Vercel deployment, so a regression points at a deploy.
- Key alerts: spike in 5xx on `/api/decisions*`, agent error rate, auth failures.
- PII discipline: scrub decision content from error payloads — error context carries IDs and
  status, never the user's private decision text.

What Sentry must make visible for the async pipeline specifically:
- `runAgent` exceptions (with `decisionId`, node name, no decision text).
- Analyses that transitioned to `failed` and *why* (validation vs provider error).
- Analyses stuck in `processing` past the timeout (the serverless-durability risk).

---

## Business / product monitoring — PostHog

- **PostHog** for product analytics, funnels, retention, and **feature flags** (e.g. gating
  the cross-decision memory feature during rollout).
- Self-host or cloud; EU region available (relevant for Ukrainian users / GDPR posture).
- PII discipline: events carry IDs, enums, counts, durations — **never** raw decision text.

### Event taxonomy (business KPIs)

| Event | Properties | Answers |
|-------|-----------|---------|
| `decision_created` | category?, has_reasoning | Are people capturing decisions? |
| `analysis_started` | version | Pipeline volume |
| `analysis_ready` | duration_ms, bias_count, complexity | Time-to-reflect; output richness |
| `analysis_failed` | reason_class | Reliability of the pipeline |
| `analysis_retried` | trigger (manual/stalled) | Durability pain in practice |
| `reanalysis_run` | prior_version | Is re-analysis used? |
| `dashboard_viewed` | — | Is the insight layer valued? |
| `locale_switched` | from, to | en/uk usage split |

Derived business dashboards: **funnel** (signup → first decision → first ready analysis),
**reliability** (ready vs failed vs stalled rate, p50/p95 time-to-ready), **engagement**
(decisions/user/week, re-analysis rate, retention), and **bias distribution** across the user
base (from enums only).

---

## Agent observability — LangSmith

LangChain/LangGraph trace natively to **LangSmith**, which is the right tool for the question
Sentry and PostHog can't answer: *what did the agent actually do?*

- Per-run trace of every node (`load-memory → analyze → validate → persist`): inputs,
  outputs, token usage, latency, and which memories were recalled.
- Catches silent quality issues — e.g. the model technically returns valid JSON but picks a
  weak category, or memory recall surfaces irrelevant past decisions.
- Token/cost tracking per run (relevant to the demo's cost story).
- Feeds the **eval** workflow (see [05 — Testing](./05-testing.md#agent-evals)): traced runs
  become datasets; LLM-as-judge scores reflection quality offline, out of the TDD loop.

PII note: LangSmith *does* see decision content (it has to, to trace the agent). Use a
project scoped to the team, with retention limits, and keep it out of any shared/cron
contexts.

---

## How the three fit together (one incident, three lenses)

```
A user's analysis fails.
  Sentry   → the exception + which node threw (e.g. validate: Zod parse error)
  LangSmith→ the exact LLM output that failed the schema (the "why")
  PostHog  → how many users hit this (blast radius) + retry behaviour after
```

Minimal, non-overlapping, and together they cover break / value / reasoning.

---

## Implementation status

All three layers are **implemented** (change `observability`):

- **Sentry** — `instrumentation.ts` / `instrumentation-client.ts` / `sentry.server.config.ts`
  / `sentry.edge.config.ts`, wired through `lib/observability/sentry.ts` (central init +
  `beforeSend` scrub + git-SHA release). `next.config.ts` is wrapped with `withSentryConfig`
  for source-map upload (skipped with a warning when `SENTRY_AUTH_TOKEN` is absent). Agent
  failures and stalled analyses are reported via `lib/observability/sentry-report.ts`.
- **PostHog** — server (`lib/observability/posthog-server.ts`, flushed inside the
  `after()` window) and client (`components/observability/posthog-provider.tsx`). The full
  taxonomy is emitted through the typed `captureEvent` wrapper; dashboards are defined in
  [`posthog/dashboards.md`](../posthog/dashboards.md).
- **LangSmith** — env-driven auto-tracing gated by `lib/observability/langsmith.ts`;
  recalled-memory ids and version attached to run metadata via the node `RunnableConfig`.

The shared privacy guard `lib/observability/scrub.ts` (allowlist of ids/enums/status/counts/
durations) backs all three sinks; `tests/unit/observability/no-prose-leak.test.ts` asserts no
decision/analysis prose reaches any sink across the pipeline.

### Resolved design questions

- **Stalled-analysis timeout** — reuse the existing retryability threshold
  (`DEFAULT_STALLED_ANALYSIS_TIMEOUT_MS`, 15 min in `lib/decisions/analysis-retryability.ts`);
  no separate observability timeout. Detection lives in the status read path.
- **`dashboard_viewed` scope** — emitted on the **analytics dashboard only** (not the
  decision history page), matching the single taxonomy event.
- **LangSmith retention + region** — project `decision-analysis`, **US** region (matching the
  default PostHog host), **14-day** trace retention. Set in the LangSmith console; tracing is
  kept out of cron/headless contexts by requiring `LANGSMITH_PROJECT` + key
  (`langsmithTracingEnabled`).
</content>
