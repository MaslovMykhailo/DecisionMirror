# CLAUDE.md

Guidance for Claude Code working in this repository. **The full working agreement is
[`AGENTS.md`](./AGENTS.md) — read it.** This file highlights what matters most and adds
Claude-Code-specific notes.

## Non-negotiables (from AGENTS.md)

1. **TDD is mandatory.** Write a failing test first; minimum code to green; refactor. No
   production code without a failing test that demanded it. Never weaken a test to pass.
2. **Mock the LLM in all tests.** Only evals call a real model, and evals are not a commit
   gate. Tests are deterministic and offline.
3. **Scope every query by `userId`.** Per-user isolation is a hard requirement; never trust a
   client-supplied owner id.
4. **Provider calls are server-side only.** Never expose an API key to the client.
5. **No decision content in Sentry/PostHog.** IDs, enums, counts, durations only.

## Orientation

- Architecture entry point: [`ARCHITECTURE.md`](./ARCHITECTURE.md); details in
  [`architecture/`](./architecture/).
- Product requirements: [`openspec/changes/build-decision-mirror/`](./openspec/changes/build-decision-mirror/).
- The agent (LangGraph.js) lives in `agent/` behind `runAgent(decisionId)`. Start agent work
  at the Zod contract (`agent/schema.ts`), not the model call.

## How to work here

- Run the gate locally before declaring done: `pnpm lint && pnpm typecheck && pnpm test`.
  Don't bypass pre-commit hooks.
- Stack: Next.js App Router + TypeScript, Prisma/Postgres (+ pgvector + LangGraph
  PostgresSaver), Auth.js (Google + Credentials), shadcn/ui, next-intl (en/uk), Vercel.
- Prefer reusing existing Zod schemas, the provider wrapper, the embeddings wrapper, and
  shadcn primitives over adding new dependencies.
- If a task can't be done test-first, **stop and say so** — don't skip the test.
- If you make or change an architectural decision, update `ARCHITECTURE.md` / the relevant
  `architecture/*.md` and flag the corresponding `openspec` artifact.

## This is a thinking + building repo

Explore-mode and OpenSpec are in use. When requirements are unclear, surface the question
rather than guessing. Capturing a decision in the right doc is part of "done."
</content>
