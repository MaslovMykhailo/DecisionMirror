## 1. Shared utilities (test-first, no callers yet)

- [ ] 1.1 Write a failing unit test for `resolveDb<T>(injected, makeDefault)` covering: returns the injected dep unchanged, and lazily invokes `makeDefault` only when none is injected.
- [ ] 1.2 Implement `lib/db/resolver.ts` to green; no `as unknown as` in its signature.
- [ ] 1.3 Write a failing unit test for a shared request reader covering JSON bodies, form-urlencoded bodies, and the empty/invalid-body fallback.
- [ ] 1.4 Implement `lib/http/read-request.ts` to green.
- [ ] 1.5 Write a failing unit test for the shared, Zod-backed analysis-status payload parser (valid payload, missing field, wrong type → null/throw per current contract).
- [ ] 1.6 Implement the shared status parser in the decisions lib, reusing the existing `AnalysisStatus` enum.

## 2. Migrate DB-injection call sites

- [ ] 2.1 Tighten the DB-dependency interface in `lib/decisions/service.ts` to concrete method-arg types (remove `args: unknown`, drop unnecessary optionals), migrate it to `resolveDb`, delete its local `defaultDb`/`resolveDb`, and remove the `as unknown as` cast.
- [ ] 2.2 Repeat 2.1 for `lib/decisions/status.ts`.
- [ ] 2.3 Repeat 2.1 for `lib/decisions/history.ts`.
- [ ] 2.4 Repeat 2.1 for `lib/analytics/dashboard.ts`.
- [ ] 2.5 Repeat 2.1 for `agent/index.ts` (`AgentDb`).
- [ ] 2.6 Run `pnpm typecheck` and fix any latent query-shape errors the tightened interfaces surface at the call site (do not re-loosen the types).

## 3. Migrate parsing call sites

- [ ] 3.1 Replace inline body parsing in `app/api/auth/signup/route.ts`, `app/api/auth/login/route.ts`, and `lib/decisions/http.ts` with `read-request.ts`; delete the three local copies.
- [ ] 3.2 Replace the manual status parsers in `components/decisions/decision-detail-view.tsx` and `decision-status-poller.tsx` with the shared parser; delete the duplicates.

## 4. Raw-SQL trust boundary

- [ ] 4.1 Write a failing test asserting `agent/memory/repository.ts` rejects a non-finite embedding value before building the vector literal.
- [ ] 4.2 Add a Zod row schema and `.parse()` for the `$queryRawUnsafe` result in `agent/memory/repository.ts`; add the finite-number guard to the vector-literal helper.
- [ ] 4.3 Write/extend a failing test for the dashboard read model asserting malformed rows are rejected and "latest" vs "all" return identical shapes.
- [ ] 4.4 Extract the dashboard "latest vs all" SQL into one parameterized query builder and Zod-validate the `$queryRaw` rows in `lib/analytics/dashboard.ts`.

## 5. Auth guard + agent owner-scoping

- [ ] 5.1 Centralize the "get user → unauthenticated result" block into one shared guard and reuse it across decision/analytics service functions.
- [ ] 5.2 Write a failing `loadMemoryNode` test asserting the decision lookup `where` is scoped by both `id` and `userId`, with the happy path unchanged.
- [ ] 5.3 Add `userId` scoping to the `loadMemoryNode` decision lookup in `agent/nodes.ts` to green.

## 6. Final gate

- [ ] 6.1 Run `pnpm lint && pnpm typecheck && pnpm test`; confirm all pre-existing suites remain green and no `as unknown as Resolved…Db` casts remain outside generated code.
- [ ] 6.2 Verify no behavior/API-shape change: diff is structural only (utilities + call-site swaps + validation), with the one intentional runtime addition being agent owner-scoping.
