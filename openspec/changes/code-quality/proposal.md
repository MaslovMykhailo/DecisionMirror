## Why

A codebase audit of `lib/`, `agent/`, `app/`, and `components/` surfaced a cluster of
maintainability risks that are cheap to fix now and expensive later: the same DB-injection
boilerplate is copy-pasted across five modules behind `as unknown as` casts that defeat
type-checking, request parsing and analysis-status parsing are duplicated across routes and
components, and raw SQL results cross trust boundaries with no runtime validation. None of these
change product behavior, but each one erodes the type safety and DRY guarantees the project
relies on. Fixing them as one focused, test-first pass hardens the foundation before more
features land on top of it.

## What Changes

- Introduce a single typed DB-dependency resolver (`lib/db/resolver.ts`) and remove the
  duplicated `defaultDb()` / `resolveDb()` + `as unknown as ResolvedXxxDb` pattern from
  `lib/decisions/{service,status,history}.ts`, `lib/analytics/dashboard.ts`, and `agent/index.ts`.
- Replace loose DB-dependency interface typings (`args: unknown`, optional methods) with concrete
  argument types so a query-shape drift is caught at compile time, not runtime.
- Extract a shared request-body reader (`lib/http/read-request.ts`) and delete the three
  near-identical implementations in `app/api/auth/signup/route.ts`,
  `app/api/auth/login/route.ts`, and `lib/decisions/http.ts`.
- Extract a shared, Zod-backed analysis-status payload parser and remove the duplicated manual
  parsers in `components/decisions/decision-detail-view.tsx` and `decision-status-poller.tsx`.
- Validate raw SQL results with Zod at the boundary in `agent/memory/repository.ts`
  (`$queryRawUnsafe`) and `lib/analytics/dashboard.ts` (`$queryRaw`) instead of casting `unknown`
  to a typed row, and guard the embedding vector literal against non-finite values.
- De-duplicate the dashboard "latest vs all" SQL (≈70 near-identical lines) behind a single
  parameterized query builder.
- Centralize the repeated "get user → unauthenticated result" guard into one helper reused by all
  decision/analytics service functions.
- Add defense-in-depth `userId` scoping to the agent memory-load query
  (`agent/nodes.ts` `loadMemoryNode`) so the decision lookup is owner-scoped even though the agent
  runs only after server-side ownership validation.

Non-goals (explicitly out of scope): generated Prisma code under `lib/db/generated/`, adding
Suspense streaming, accessibility focus management, and any change to product-facing behavior or
API response shapes.

## Capabilities

### New Capabilities
- `code-quality-conventions`: Enforceable internal conventions for DB-dependency injection,
  trust-boundary validation of raw SQL results, shared request/response parsing, and
  defense-in-depth query scoping — the rules this refactor establishes and that future code must
  follow.

### Modified Capabilities
<!-- None. This change is purely internal; no product-facing requirement changes. -->

## Impact

- **Code**: `lib/db/` (new resolver), `lib/http/` (new request reader), `lib/decisions/`
  (service, status, history, http), `lib/analytics/dashboard.ts`, `agent/index.ts`,
  `agent/nodes.ts`, `agent/memory/repository.ts`, `components/decisions/*`.
- **Tests**: New unit tests precede each refactor (TDD); existing unit suites in
  `tests/unit/{decisions,agent,analytics,auth}` must stay green and are the regression net.
- **APIs / behavior**: None. HTTP response shapes, query results, and UI are unchanged by design.
- **Dependencies**: None added — reuses existing Zod, Prisma, and shadcn primitives.
- **Risk**: Low/mechanical, but touches the DB-access layer; the userId-scoping addition and the
  raw-SQL validation are the only changes with runtime semantics and are covered by tests first.
