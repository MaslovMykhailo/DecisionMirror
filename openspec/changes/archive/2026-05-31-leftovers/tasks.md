## 1. CI Quality Gate

- [x] 1.1 Add a failing structure test that requires a GitHub Actions workflow for PRs and pushes to `main`, covering format check, lint, typecheck, unit/component tests, integration tests, build, and Playwright e2e.
- [x] 1.2 Add the GitHub Actions workflow with pnpm/Next caching, a pgvector-capable Postgres service, `prisma migrate deploy`, checkpointer setup, and test-safe env defaults.
- [x] 1.3 Ensure the workflow does not invoke Vercel deploy commands and does not require real OpenAI, Voyage, embeddings, Sentry, PostHog, or LangSmith secrets for deterministic jobs.
- [ ] 1.4 Verify the workflow names with `gh workflow list` and record or configure required `main` checks once the workflow exists, without changing the existing Vercel prod-on-main deploy setup.

## 2. App Icon

- [x] 2.1 Add a failing test that proves `/favicon.ico` is not SVG text served as an ICO response and that the icon bytes/content type are decodable.
- [x] 2.2 Replace `app/favicon.ico/route.ts` with a Next.js-supported app icon convention, preferably a real `app/favicon.ico` binary for the existing `/favicon.ico` URL.
- [ ] 2.3 Verify the production build emits valid icon metadata and, after merge/deploy, confirm the deployed `/favicon.ico` response is decodable.

## 3. Repository Placeholder Cleanup

- [x] 3.1 Add a failing structure test that rejects tracked project `.gitkeep` files outside dependency/generated-output directories.
- [x] 3.2 Remove the tracked project `.gitkeep` files from source, app, test, message, and e2e directories.

## 4. Language Switch Warning

- [x] 4.1 Add a failing Playwright regression that switches `en` to `uk` and `uk` to `en`, captures browser console messages, and fails on the React script-tag warning.
- [x] 4.2 Refactor provider/layout composition so locale navigation does not client-render a raw script tag while preserving `next-themes`, PostHog, and next-intl behavior.
- [x] 4.3 Verify theme persistence and locale switching still work after the provider/layout change.

## 5. Sentry Example Page Cleanup

- [x] 5.1 Add a failing route inventory or page test that asserts localized `sentry-example-page` routes are not part of the production app.
- [x] 5.2 Remove `app/[locale]/sentry-example-page/page.tsx` and any references to that scaffolded route while keeping Sentry instrumentation tests intact.

## 6. Validation and OpenSpec Cleanup

- [x] 6.1 Run the relevant focused tests as each area is implemented, then run `pnpm lint`, `pnpm format:check`, `pnpm typecheck`, `pnpm test`, relevant integration tests, `pnpm build`, and relevant Playwright specs.
- [x] 6.2 Remove or archive `openspec/changes/build-decision-mirror` after the leftover implementation is complete and this change is the active source of truth.
- [x] 6.3 Validate the OpenSpec change and confirm no `15.delivery` work was imported into this scope.
