# 01 — Developer Experience

Goal: a setup where the "obvious" way to work is also the correct one. Conventions are
enforced by tooling (lint, format, types, hooks, CI) rather than by memory, so they hold
for both human contributors and AI agents.

---

## Project structure

Single Next.js repository. One deployable artifact.

```
decision-mirror/
├─ app/                          # Next.js App Router
│  ├─ [locale]/                  # next-intl locale segment (en | uk)
│  │  ├─ (auth)/                 # sign-in / sign-up route group
│  │  ├─ (app)/                  # authenticated app: capture, history, dashboard
│  │  └─ layout.tsx
│  └─ api/                       # Route Handlers (REST-ish endpoints)
│     └─ decisions/...
├─ components/
│  ├─ ui/                        # shadcn/ui primitives (generated, kebab-case)
│  └─ <feature>/                 # composed feature components
├─ lib/
│  ├─ auth/                      # Auth.js config, session helpers
│  ├─ db/                        # Prisma client, query helpers
│  ├─ i18n/                      # next-intl config, request helpers
│  ├─ validation/                # Zod schemas shared client+server
│  └─ analytics/                 # PostHog / Sentry wrappers
├─ agent/                        # LangGraph.js agent (the "agentic service")
│  ├─ graph.ts                   # StateGraph definition + compile
│  ├─ nodes/                     # load-memory, analyze, validate, persist
│  ├─ memory/                    # pgvector recall + write, embeddings
│  ├─ prompts/                   # system prompt, instruction templates
│  └─ schema.ts                  # Zod schema = the LLM output contract
├─ messages/                     # next-intl translations: en.json, uk.json
├─ prisma/
│  ├─ schema.prisma
│  └─ migrations/
├─ tests/                        # unit + integration (Vitest)
├─ e2e/                          # Playwright specs
├─ AGENTS.md                     # agent working agreement (TDD mandate)
├─ CLAUDE.md                     # Claude Code working agreement (TDD mandate)
└─ ARCHITECTURE.md
```

The `agent/` directory is the in-process equivalent of a service: it has one public entry
(`runAgent(decisionId)`) and never reaches into UI concerns. If it ever moves out of process
(see [02 — scale-up seam](./02-stack.md#scale-up-seam)), this boundary is the cut line.

---

## Language & tooling

| Concern | Tool | Notes |
|---------|------|-------|
| Language | TypeScript (strict) | `strict: true`, `noUncheckedIndexedAccess: true` |
| Package manager | pnpm | Fast, strict, good CI caching |
| Lint | ESLint (flat config) | `eslint.config.mjs`; `next/core-web-vitals`, `@typescript-eslint`, import-order, a11y |
| Format | Prettier | Single source of formatting truth; `prettier-plugin-tailwindcss` sorts classes |
| Types in CI | `tsc --noEmit` | Type errors fail the build |
| Validation | Zod | One schema reused for form validation, API parsing, and the LLM contract |
| Hooks | Husky + lint-staged | Pre-commit: format + lint + typecheck staged files |
| Commits | Conventional Commits (commitlint) | Enables readable history / changelogs (optional but recommended) |

ESLint and Prettier have **non-overlapping** responsibilities (lint = correctness/quality,
format = whitespace/style) via `eslint-config-prettier`, so they never fight.

---

## Naming conventions

| Thing | Convention | Example |
|-------|-----------|---------|
| File names | `kebab-case` | `decision-card.tsx`, `use-poll-status.ts` |
| React components (export) | `PascalCase` | `export function DecisionCard()` |
| Hooks | `useCamelCase`, file `use-*.ts` | `usePollStatus` in `use-poll-status.ts` |
| Functions / variables | `camelCase` | `runAgent`, `currentAnalysis` |
| Types / interfaces / enums | `PascalCase`, no `I` prefix | `Analysis`, `BiasCatalog` |
| Constants (true consts) | `UPPER_SNAKE_CASE` | `MAX_POLL_ATTEMPTS` |
| Zod schemas | `camelCaseSchema` | `decisionInputSchema` |
| DB tables (Prisma models) | `PascalCase` singular | `Decision`, `Analysis` |
| Route Handler files | Next.js convention | `app/api/decisions/route.ts` |
| Test files | `*.test.ts` (unit/integration), `*.spec.ts` (e2e) | `complexity.test.ts`, `capture.spec.ts` |

Path alias: `@/` → repo root, so imports read `@/lib/db` not `../../../lib/db`.

---

## The TDD workflow (mandatory)

This is the single most important convention and is mirrored in `AGENTS.md` / `CLAUDE.md`.

```
        ┌──────────┐      ┌──────────┐      ┌────────────┐
   ────▶│   RED    │─────▶│  GREEN   │─────▶│  REFACTOR  │────┐
        │ write a  │      │ minimal  │      │ clean up,  │    │
        │ failing  │      │ code to  │      │ tests stay │    │
        │  test    │      │   pass   │      │   green    │    │
        └──────────┘      └──────────┘      └────────────┘    │
             ▲                                                │
             └────────────────────────────────────────────────┘
```

Rules:

1. **No production code without a failing test that demands it.** Commits that add behaviour
   must also add/extend tests; CI checks coverage does not regress.
2. **Test the boundary you own, mock the boundary you don't.** The LLM provider is always
   mocked in unit/integration tests so they are deterministic and free. The *quality* of LLM
   output is checked separately by evals (see [05](./05-testing.md)), never in the red-green loop.
3. **Start at the contract.** For the agent, the first test is against `agent/schema.ts` (the
   Zod output contract) and the deterministic transforms (e.g. complexity derivation), not the
   model call.
4. **One assertion of intent per test.** Prefer many small, named tests over one large one.

What this looks like per layer is detailed in [05 — Testing](./05-testing.md).

---

## Local developer loop

```
pnpm install
docker compose up -d        # local Postgres + pgvector
pnpm db:migrate             # prisma migrate dev
pnpm dev                    # next dev (Turbopack)
pnpm test --watch           # Vitest in watch mode — the TDD companion
pnpm test:e2e               # Playwright (LLM stubbed)
pnpm lint && pnpm typecheck # what CI will also run
```

Environment is documented in `.env.example` (committed) and loaded from `.env.local`
(git-ignored). Required keys: `DATABASE_URL`, `AUTH_SECRET`, `AUTH_GOOGLE_ID/SECRET`,
`ANTHROPIC_API_KEY`, embeddings key, `SENTRY_DSN`, `POSTHOG_KEY`, `LANGSMITH_API_KEY`.

---

## Project MCP allowlist

MCP servers are build- and operate-time tooling for agents working on this repository. They
are not runtime dependencies of the Decision Mirror app or the LangGraph.js agent.

Project-scoped MCP config lives in:

- `.mcp.json` for Claude Code
- `.cursor/mcp.json` for Cursor
- `.codex/config.toml` for Codex CLI / IDE extension

Only these MCP servers are in scope:

| Server | Purpose | Auth / setup |
|--------|---------|--------------|
| `context7` | Current docs for fast-moving libraries | `CONTEXT7_API_KEY` header |
| `prisma` | Local Prisma schema/database workflows | Local `npx -y prisma mcp` |
| `shadcn` | shadcn/ui registry browse/search/install | Local `npx shadcn@latest mcp` |
| `playwright` | Browser automation for e2e authoring/debugging | Local `npx -y @playwright/mcp@latest` |
| `vercel` | Deployments, build logs, Vercel project context | Remote OAuth at `https://mcp.vercel.com` |
| `sentry` | Issue/error investigation | Remote OAuth at `https://mcp.sentry.dev/mcp` |
| `posthog` | Product analytics, flags, error/product triage | Remote OAuth at `https://mcp.posthog.com/mcp` |
| `langsmith` | Agent traces, datasets, experiments, eval support | `LANGSMITH_API_KEY` header |
| `next-devtools` | Next.js runtime/dev diagnostics | Local `npx -y next-devtools-mcp@latest` |

Do not configure other MCP servers for this project unless the architecture changes. GitHub
and Neon are intentionally not configured even though they can be useful in other stacks.

Privacy rule: Sentry and PostHog MCP usage must never send or surface raw decision text.
LangSmith traces can include decision content by design; keep LangSmith MCP use to scoped
development and eval work.
</content>
