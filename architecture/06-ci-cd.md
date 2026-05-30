# 06 — CI/CD

GitHub Actions gates every change; Vercel deploys. Preview-per-PR, prod-on-main.

---

## Pipeline (GitHub Actions)

```
push / PR
   │
   ▼
┌─────────────┐   setup: checkout, pnpm, Node, restore cache
│   install   │
└──────┬──────┘
       ├──────────────┬───────────────┐
       ▼              ▼               ▼          (run in parallel — all fast, no model calls)
┌────────────┐ ┌────────────┐  ┌──────────────────┐
│ lint+format│ │  typecheck │  │ unit+integration │  ← Postgres+pgvector service container,
│  (ESLint,  │ │ (tsc       │  │     (Vitest)     │     prisma migrate, LLM mocked
│  Prettier) │ │  --noEmit) │  └──────────────────┘
└────────────┘ └────────────┘
       └──────────────┴───────────────┘
                      ▼
              ┌───────────────┐
              │     build     │  next build (also catches build-time errors)
              └───────┬───────┘
                      ▼
              ┌───────────────┐
              │  e2e (Playwright) │  against the built app, LLM STUBBED → deterministic
              └───────┬───────┘
                      ▼
                ✅ all green → merge allowed
```

- **Postgres in CI:** a `services: postgres` container with the pgvector image; the workflow
  runs `prisma migrate deploy` and `pnpm db:setup-checkpointer` before integration tests.
  Same engine as production, so vector, checkpoint, and relational behaviour is real in CI.
- **Caching:** pnpm store + Next.js build cache + Playwright browsers cached by key.
- **No real model calls in CI:** unit/integration mock the provider; e2e stubs it. Keeps CI
  fast, free, and non-flaky. (Optional cheap structural eval smoke-check can run here; the
  judgmental LLM-as-judge evals run on a schedule — see [05](./05-testing.md#agent-evals).)
- **Branch protection:** the lint/typecheck/test/build/e2e jobs are required checks on `main`.

---

## Deployment (Vercel)

```
PR opened/updated  ─▶  Vercel Preview Deployment   (unique URL per PR, for review/QA)
merge to main      ─▶  Vercel Production Deployment
```

- Vercel's Git integration handles the deploy; GitHub Actions handles the **quality gate**.
  A PR can't merge to `main` until checks pass, so production only ever builds green commits.
- **Database migrations:** `prisma migrate deploy` runs as part of the release (Vercel build
  step / deploy hook). Schema changes are additive during the build to keep rollback safe.
- **Rollback:** redeploy the previous deployment (Vercel keeps them) — i.e. the previous git
  commit. Additive migrations mean a code rollback doesn't strand the schema.

---

## Environments & secrets

| Environment | Trigger | Database | Secrets source |
|-------------|---------|----------|----------------|
| Local | `pnpm dev` | docker compose Postgres | `.env.local` (git-ignored) |
| CI | push / PR | ephemeral service container | GitHub Actions secrets |
| Preview | PR | preview/branch DB (or pooled dev DB) | Vercel env (Preview scope) |
| Production | merge to main | hosted Postgres (Neon/Vercel) | Vercel env (Production scope) |

Required secrets (mirrored across CI / Vercel as applicable): `DATABASE_URL`, `AUTH_SECRET`,
`AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`, `OPENAI_API_KEY`, `AGENT_EMBEDDINGS_PROVIDER`,
embeddings key/model settings, `AGENT_MEMORY_TOP_K`, `SENTRY_DSN` (+ auth token for
source-map upload), `POSTHOG_KEY`, `LANGSMITH_API_KEY`, and LangSmith tracing/project
variables when tracing is enabled. Documented in `.env.example`; never committed with values.

---

## Release hygiene

- **Conventional Commits** → readable history and optional automated changelog.
- **Sentry release** tagged with the git SHA on each prod deploy, so regressions map to a
  specific deployment (see [04 — Observability](./04-observability.md)).
- **Dependabot / Renovate** (optional) for dependency PRs, which flow through the same gate.
</content>
