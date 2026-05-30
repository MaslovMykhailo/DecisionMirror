## Context

`openspec/changes/build-decision-mirror/tasks.md` still lists the original full product scope,
but the repository already contains the core Next.js app, auth, decision capture/history,
analysis pipeline, observability integrations, tests, and e2e specs. The remaining work is
smaller and cross-cutting:

- CI is not represented in the repo: there is no `.github/workflows` directory, and `gh workflow
  list --repo MaslovMykhailo/DecisionMirror` returned no workflows.
- Vercel production deployment is already connected to `main`; this change must not recreate
  that delivery task.
- The deployed `/favicon.ico` endpoint returns SVG text while the response is advertised as an
  ICO file, which makes the icon undecodable in browsers.
- Source/test directories still contain tracked `.gitkeep` placeholders even when directories now
  contain real files.
- The language switch flow can surface React's client-rendered script warning. The local app wraps
  locale content in `next-themes`, and `next-themes` intentionally injects an inline script for
  no-flash theme initialization. Locale navigation must avoid re-rendering that script through a
  client render path.
- The Sentry setup still includes the scaffolded `app/[locale]/sentry-example-page` route. That
  route is useful during initial setup, but it should not remain as a production-facing page.

## Goals / Non-Goals

**Goals:**

- Add a deterministic GitHub Actions gate that matches local commands and preserves the "no real
  model calls in tests" rule.
- Keep Vercel deployment as-is: production remains automatic on `main`.
- Serve a valid, decodable app icon on the deployed domain.
- Remove obsolete project `.gitkeep` files from tracked source/test directories.
- Fix and regress the language switch warning.
- Drop the Sentry scaffold/example page while preserving actual Sentry instrumentation coverage.
- Remove or archive the stale `build-decision-mirror` OpenSpec change after this leftover scope is
  implemented.

**Non-Goals:**

- Do not implement `15.delivery` from the original task list.
- Do not add a new deployment system or deploy from GitHub Actions.
- Do not make live LLM or live embeddings calls in CI.
- Do not broaden this change into product feature work that is already covered by existing specs.

## Decisions

### D1 - CI owns quality gates; Vercel owns deployment

Add GitHub Actions workflows for the deterministic gate only. CI should install with pnpm, cache
the pnpm store and Next.js cache, run `pnpm format:check`, `pnpm lint`, `pnpm typecheck`,
`pnpm test`, `pnpm test:integration`, `pnpm build`, and `pnpm test:e2e` with test-safe
environment defaults. Vercel remains responsible for previews and production deployment.

Alternative considered: deploy from CI. Rejected because Vercel Git integration already deploys
on `main`, and adding a second deploy path would create avoidable ownership ambiguity.

### D2 - CI database tests use a pgvector Postgres service

Integration jobs should run against a service container that supports pgvector, then run
`pnpm db:migrate:deploy` and `pnpm db:setup-checkpointer` before integration tests. E2E can reuse
the same database setup or run in a dependent job with equivalent setup, but it must keep the LLM
provider stubbed.

Alternative considered: self-skip integration/e2e in CI when `DATABASE_URL` is absent. Rejected
because those checks are part of the original CI/CD leftover and should be real gates.

### D3 - App icon uses a Next.js-supported icon convention with matching bytes and MIME type

Do not keep serving SVG text from `app/favicon.ico/route.ts`. Use one of these approaches:

- Prefer a real `app/favicon.ico` binary if the desired URL must remain `/favicon.ico`.
- Or add `app/icon.svg`/`app/icon.tsx` with exported metadata and let Next.js emit the matching
  `<link rel="icon">` tag.

For this project, a real `app/favicon.ico` is the safest fix because browser requests already
target `/favicon.ico`, and Next.js reserves root `favicon.ico` for an actual `.ico` file.

Alternative considered: keep the route handler and force `image/svg+xml`. Rejected because the
route is currently deployed as `/favicon.ico`, and the file extension plus platform behavior made
the served response inconsistent.

### D4 - Theme script must not be re-rendered by locale navigation

The likely warning source is the theme provider's no-flash inline script being present in a tree
that remounts or client-renders during locale changes. Keep `suppressHydrationWarning` on `<html>`,
but move any script-emitting provider to a stable root that does not remount per locale, or replace
the provider composition with an app-level provider boundary that prevents the script from being
rendered during client-side locale replacement.

Tests should reproduce the locale switch and assert that no browser console error/warning matching
the React script-tag message occurs.

Alternative considered: silence the warning. Rejected because it masks a real client-rendered
script path and could hide future hydration/runtime issues.

### D5 - `.gitkeep` removal is source hygiene, not directory deletion by accident

Remove only tracked project `.gitkeep` files. Do not remove dependency placeholders under
`node_modules`. Empty directories do not need to remain tracked unless a real consumer requires
them; if a directory is still required, add a meaningful README or generated runtime creation
instead of keeping a placeholder.

Alternative considered: leave `.gitkeep` files harmlessly. Rejected because the user explicitly
requested their removal and the project now has real files in most of those directories.

### D6 - Sentry verification belongs in tests, not a public example page

Delete `app/[locale]/sentry-example-page/page.tsx` and rely on existing Sentry unit coverage plus
focused test harnesses for instrumentation checks. A localized public example route creates
unnecessary surface area and can be mistaken for product UI.

Alternative considered: keep the page hidden or unlinked. Rejected because it would still be
routable and would keep scaffold code in the shipped app.

## Risks / Trade-offs

- CI runtime could become slow if all jobs run serially -> split independent gate jobs and share
  cached install/build artifacts where practical.
- Playwright or integration tests could become flaky if they depend on live services -> use local
  service containers and stub LLM/embeddings providers.
- Replacing the favicon route with a binary asset may require careful deletion of the route
  directory -> cover it with a route/header/body regression test and verify deployed headers after
  merge.
- Moving provider boundaries can affect theme persistence or first-paint theme behavior -> keep
  existing theme tests and add browser coverage for locale switch plus dark-mode behavior.
- Removing the Sentry example page could reduce manual setup verification -> keep Sentry config,
  scrubbing, and release tests as the verification path.

## Migration Plan

1. Implement tests first for icon response validity, `.gitkeep` absence, CI workflow shape,
   language-switch console cleanliness, and absence of the Sentry example route.
2. Apply the minimal code/config changes to pass those tests.
3. Run `pnpm lint`, `pnpm format:check`, `pnpm typecheck`, `pnpm test`, relevant integration
   tests, `pnpm build`, and relevant Playwright specs locally.
4. After the leftovers change lands, remove or archive `openspec/changes/build-decision-mirror`.
5. Let the existing Vercel Git integration deploy from `main`; verify `/favicon.ico` after deploy.

## Open Questions

- Whether branch protection can be configured automatically with the available GitHub permissions,
  or must be completed manually after the workflow names exist.
