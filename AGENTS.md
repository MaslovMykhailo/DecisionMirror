# AGENTS.md — Working Agreement

This file is the working agreement for **any** automated agent (Claude Code, Codex, Cursor,
etc.) contributing to Decision Mirror. Humans follow it too. It is intentionally short; the
detail lives in [`ARCHITECTURE.md`](./ARCHITECTURE.md) and [`architecture/`](./architecture/).

---

## 1. TDD is mandatory — no exceptions

**Write a failing test before you write the production code that makes it pass.**

```
RED  →  write a failing test that expresses the intended behaviour
GREEN→  write the minimum code to make it pass
REFACTOR→ clean up with the test staying green
```

Rules:
- **No production code without a failing test that demands it.** A change that adds behaviour
  must add or extend a test in the same change.
- **Start at the contract.** For agent work, the first test targets the Zod output schema
  (`agent/schema.ts`) and deterministic transforms (e.g. complexity), not the model call.
- **Never weaken a test to make code pass.** Fix the code, or fix the test for the right
  reason and say why.
- **Coverage must not regress.** CI enforces this.
- If you believe a task genuinely can't be done test-first, **stop and flag it** rather than
  skipping the test.

See [architecture/05-testing.md](./architecture/05-testing.md) for the full pyramid.

## 2. Keep non-determinism out of the test loop

- The **LLM provider is always mocked/stubbed** in unit, integration, and e2e tests. Only
  **evals** call a real model, and evals are not a commit gate.
- Tests must be deterministic and runnable offline. No network to real Claude/Voyage in CI.

## 3. Respect the boundaries

- The agent lives behind `runAgent(decisionId)` in `agent/`. It owns no UI/HTTP concerns and
  is the single cut line if it ever leaves the process. Don't leak agent internals upward or
  UI concerns downward.
- All data access is **scoped by `userId`** from the session. Never trust a client-supplied
  user/owner id. Per-user isolation is a hard requirement.
- All LLM/provider calls are **server-side only**. Never ship a provider key to the client.

## 4. Validate at every edge

- Use **Zod** for form input, API payloads, and the LLM output contract — reuse the same
  schemas, don't duplicate them.
- Invalid LLM output is a **handled state** (`status=failed` + reason, retryable), not a crash.

## 5. Privacy in telemetry

- Decision text is private. **Never** send raw decision content to Sentry or PostHog — IDs,
  enums, counts, and durations only. (LangSmith necessarily sees content; keep it scoped.)

## 6. Conventions

- TypeScript strict. `kebab-case` files, `PascalCase` components/types, `camelCase`
  functions, `UPPER_SNAKE_CASE` true constants. Import via `@/`.
- Lint, format, and typecheck must pass before commit (pre-commit hooks run them). Don't
  bypass hooks.
- Conventional Commits.

## 7. Before you finish a change

- [ ] New/changed behaviour has tests, written test-first.
- [ ] `pnpm lint && pnpm typecheck && pnpm test` pass locally.
- [ ] No real-model calls added to the test path.
- [ ] No decision content in telemetry payloads.
- [ ] Queries scoped by `userId`.
- [ ] Docs/specs updated if a decision changed (`ARCHITECTURE.md`, `openspec/…`).
</content>

<!-- context7 -->
Use Context7 MCP to fetch current documentation whenever the user asks about a library, framework, SDK, API, CLI tool, or cloud service -- even well-known ones like React, Next.js, Prisma, Express, Tailwind, Django, or Spring Boot. This includes API syntax, configuration, version migration, library-specific debugging, setup instructions, and CLI tool usage. Use even when you think you know the answer -- your training data may not reflect recent changes. Prefer this over web search for library docs.

Do not use for: refactoring, writing scripts from scratch, debugging business logic, code review, or general programming concepts.

## Steps

1. Always start with `resolve-library-id` using the library name and the user's question, unless the user provides an exact library ID in `/org/project` format
2. Pick the best match (ID format: `/org/project`) by: exact name match, description relevance, code snippet count, source reputation (High/Medium preferred), and benchmark score (higher is better). If results don't look right, try alternate names or queries (e.g., "next.js" not "nextjs", or rephrase the question). Use version-specific IDs when the user mentions a version
3. `query-docs` with the selected library ID and the user's full question (not single words)
4. Answer using the fetched docs
<!-- context7 -->
