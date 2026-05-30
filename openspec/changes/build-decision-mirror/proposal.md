## Why

People make important life and work decisions under cognitive pressure and rarely examine the thinking behind them. Decision Mirror is a private decision journal that records a decision and uses an LLM to reflect it back — surfacing likely cognitive biases, missed alternatives, failure modes, and hidden assumptions — so a person can see a choice from the outside before it becomes a regret. This change builds the full first version of the product end to end (auth, capture, background analysis, history, dashboard, and supporting UX).

## What Changes

- Add real user authentication: account signup, login, logout, **Sign in with Google (OAuth)**, and per-user data isolation.
- Add a decision capture form (situation, decision, optional reasoning) that persists a record and immediately enqueues background analysis.
- Add an LLM analysis pipeline (an in-process LangGraph.js agent) that runs asynchronously and returns a structured reflection: decision category, cognitive biases, missed alternatives, premortem risks, key assumptions, and early warning signs.
- Add **memory-informed analysis**: the agent recalls a user's semantically similar prior decisions (per-user scoped) to surface recurring patterns; the pipeline still works when no prior decisions exist.
- Add **internationalization**: the interface is available in English and Ukrainian, and free-form analysis text is generated in the user's selected language.
- Add explicit analysis lifecycle status (`processing` → `ready` | `failed`) that is visible throughout the UI.
- Add a history experience: a per-user list and a detail view showing the original input alongside the generated analysis.
- Add re-analysis with version history: re-running analysis appends a new version and prior analyses remain viewable.
- Add filtering (by category and by present bias) and sorting (by creation time and by derived complexity).
- Add an analytics dashboard visualizing frequency of decision categories and cognitive biases across a user's decisions.
- Add first-class UX states (loading, error, retry, "not ready yet" explanations) and a dark theme.

## Capabilities

### New Capabilities
- `authentication`: account creation, login/logout, **Sign in with Google (OAuth)**, sessions, and per-user data scoping.
- `decision-capture`: the create-decision form, validation, persistence, and triggering of background analysis.
- `decision-analysis`: the asynchronous LLM analysis pipeline, structured output schema, controlled taxonomies, lifecycle status, retry/re-analysis, version history, **memory-informed analysis (per-user recall of prior decisions)**, and **locale-aware free-form output**.
- `decision-history`: list and detail views, status display, filtering, sorting, and derived complexity.
- `analytics-dashboard`: aggregate visualizations of category and bias frequency for the signed-in user.
- `app-ux`: cross-cutting UX-state behavior (loading/error/retry/empty) and dark theme.
- `internationalization`: English and Ukrainian interface, language selection/persistence, locale-correct formatting, and localized taxonomy labels over language-neutral identifiers.

### Modified Capabilities
<!-- None — greenfield project, all capabilities are new. -->

## Impact

- New full-stack application (greenfield): web frontend, API/server routes, database, and an in-process LangGraph.js agent integrating an LLM provider.
- New external dependencies and env-managed keys: an LLM provider (OpenAI), an embeddings provider (Voyage AI, OpenAI as alternative), Google OAuth credentials, and observability services (Sentry, PostHog, LangSmith).
- New persistent datastore (PostgreSQL) for users, decisions, and analysis versions, plus a `pgvector` extension for long-term agent memory and a LangGraph checkpointer for run state — all on the same instance.
- New cross-cutting observability: Sentry (errors/performance), PostHog (product/business analytics), and LangSmith (agent tracing + evals), with decision text excluded from Sentry/PostHog payloads.
- Deployment target: a public GitHub repository with a GitHub Actions quality gate plus a hosted demo (Vercel), with a detailed README covering setup, architecture, internationalization, observability, and environment variables.

> Technical detail for all of the above lives in [`ARCHITECTURE.md`](../../../ARCHITECTURE.md) and [`architecture/`](../../../architecture/); decision rationale is in [`design.md`](./design.md).
