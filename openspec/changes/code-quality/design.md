## Context

An audit of the non-generated source (`lib/`, `agent/`, `app/`, `components/`) found the same
boilerplate repeated across modules and several `unknown`/`as unknown as` casts that bypass the
type checker. The highest-confidence, verified findings:

- **DB-injection boilerplate (×5).** `lib/decisions/{service,status,history}.ts`,
  `lib/analytics/dashboard.ts`, and `agent/index.ts` each define a private `defaultDb()` +
  `resolveDb()` pair and cast the Prisma client with `as unknown as Resolved…Db`. The injected DB
  interfaces type method args as `unknown` and mark methods optional, so a query-shape change
  compiles but breaks at runtime.
- **Request-body parsing (×3).** `app/api/auth/signup/route.ts`, `app/api/auth/login/route.ts`,
  and `lib/decisions/http.ts` each reimplement content-type sniffing + `formData`/`json` fallback.
- **Analysis-status payload parsing (×2).** `components/decisions/decision-detail-view.tsx` and
  `decision-status-poller.tsx` each hand-roll a manual `typeof`-checking parser.
- **Raw-SQL trust boundary.** `agent/memory/repository.ts` casts `$queryRawUnsafe` output to
  `DecisionMemoryRow[]` and builds a `pgvector` literal by string concatenation with no
  finite-number guard; `lib/analytics/dashboard.ts` casts `$queryRaw` output and duplicates ≈70
  lines of "latest vs all" SQL.
- **Auth guard (×~10).** Decision/analytics service functions repeat `getUser()` +
  unauthenticated-result.

Constraints from `AGENTS.md`/`CLAUDE.md`: TDD is mandatory (failing test first), the LLM is mocked
in all tests, every query is `userId`-scoped, provider calls stay server-side, and no decision
content reaches telemetry. The existing unit suites (`tests/unit/{decisions,agent,analytics,auth}`,
including `nodes.test.ts`, service tests, `dashboard-read-model.test.ts`) are the regression net —
they must stay green throughout.

Two findings from the raw audit were investigated and **rejected**: there is no test gap (the
suites above exist), and `loadMemoryNode` is not a mandate violation because `userId` is derived
from the fetched row, not from the client — its scoping is added here only as defense-in-depth.

## Goals / Non-Goals

**Goals:**
- Eliminate the duplicated DB-injection, request-parsing, and status-parsing code behind single
  shared utilities.
- Restore compile-time safety at the DB-dependency and raw-SQL boundaries (no `as unknown as`, no
  `args: unknown`, schema-validated raw rows).
- Keep all product behavior, API response shapes, and UI byte-for-byte identical — proven by the
  existing suites staying green.

**Non-Goals:**
- Generated Prisma code under `lib/db/generated/` (left untouched).
- Suspense streaming, accessibility focus management, debouncing, or other UX changes surfaced by
  the audit — out of scope for this pass.
- Any new dependency or change to discriminated-union return types of services (kept as-is to
  avoid behavior risk).

## Decisions

**1. One generic resolver over a base class.**
`lib/db/resolver.ts` exports `resolveDb<T>(injected: T | undefined, makeDefault: () => Promise<T>): Promise<T>`.
Each module passes its own concrete `Resolved…Db` type as `T` and a thunk returning the Prisma
client. *Why over a shared base class / DI container:* minimal, tree-shakeable, no inheritance, and
each module keeps ownership of its own narrow DB type. *Alternative rejected:* a single global
typed client — it would re-introduce a wide type and lose per-module narrowing that keeps tests
able to inject tiny fakes.

**2. Concrete method-arg types instead of `args: unknown`.**
Replace `findFirst?: (args: unknown) => …` with the precise argument type each call site already
uses. *Why:* this is what actually catches query-shape drift; the `as unknown as` casts only exist
*because* the interfaces are loose, so tightening the interface lets the cast disappear.

**3. Zod at the raw-SQL boundary, builders to kill SQL duplication.**
Define a Zod row schema per raw query and `.parse()` the result; extract the dashboard "latest vs
all" branches into one parameterized query builder. Add a `Number.isFinite` guard in the vector
literal helper. *Why Zod over a hand cast:* the project already standardizes on Zod at boundaries,
and a malformed row currently fails far from its cause.

**4. Shared parsers live next to their domain.**
`lib/http/read-request.ts` for request bodies; the analysis-status parser moves into the existing
decisions lib (reusing the status enum) and both components import it. *Why:* keeps the client
parser and its schema co-located with the server-side status contract.

**5. Strict TDD sequencing, one finding per commit.**
Each utility gets a failing unit test first; each call-site migration is a separate green step
guarded by the pre-existing suite. *Why:* makes every refactor independently revertable and proves
behavior is unchanged.

## Risks / Trade-offs

- **Touching the DB-access layer broadly** → Mitigation: behavior is pinned by existing unit tests;
  migrate one module per step and run `pnpm lint && pnpm typecheck && pnpm test` between steps.
- **Tightening DB interfaces surfaces latent type errors** → Mitigation: that is the intent; fix
  each at the call site, do not re-loosen the type to pass.
- **Adding `userId` to the agent decision lookup could change a result** → Mitigation: it can only
  ever narrow to the true owner (userId comes from the same row today); covered by a node test
  asserting the owner-scoped `where` and an unchanged happy path.
- **Zod parse adds a tiny per-query cost** → Accepted: negligible vs. a network DB round-trip, and
  it converts silent corruption into a loud failure.

## Migration Plan

1. Land shared utilities (`resolver`, `read-request`, status parser) test-first with no callers.
2. Migrate call sites module-by-module, deleting the local duplicate in the same step.
3. Tighten DB interfaces and remove the now-unnecessary `as unknown as` casts.
4. Add raw-SQL Zod validation + vector guard; collapse dashboard SQL into the builder.
5. Add owner-scoping + its test to `loadMemoryNode`.
6. Final gate: `pnpm lint && pnpm typecheck && pnpm test` all green.

Rollback: each step is an isolated commit; revert any single step without affecting the others.

## Open Questions

- None blocking. If tightening a DB interface reveals a real (not merely typing) behavior bug, that
  fix is surfaced as a separate finding rather than absorbed silently into this change.
