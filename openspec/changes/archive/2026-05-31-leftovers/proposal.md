## Why

The original `build-decision-mirror` change is now too broad and stale: most product work has
landed, but a few operational and polish leftovers still need explicit scope before that change
is removed. This change captures only the remaining non-delivery work: CI gates, deployed icon
correctness, repository hygiene, and a language-switch runtime warning.

## What Changes

- Add a GitHub Actions quality gate for lint/format, typecheck, unit/integration tests, build,
  and deterministic Playwright e2e. Vercel Git deployment is already connected and remains out of
  scope except for ensuring CI can run before merges to `main`.
- Fix app icon delivery so the deployed `/favicon.ico` response is a browser-decodable icon, or
  replace it with a Next.js-supported icon convention that emits matching type/content.
- Remove tracked project `.gitkeep` placeholders now that the corresponding directories contain
  real files or should not be kept empty.
- Fix the language switch flow so switching between English and Ukrainian does not render a raw
  `<script>` tag through React on the client.
- Drop the scaffolded `app/[locale]/sentry-example-page` route so no vendor demo page ships in
  the production app.
- Remove or archive `openspec/changes/build-decision-mirror` after these leftovers are captured
  and implemented, since it no longer represents the current work plan.
- Exclude `15.delivery` from this scope; README/public-repo/deployed-demo smoke-test work will be
  handled later.

## Capabilities

### New Capabilities

- `ci-quality-gate`: GitHub Actions checks that run the deterministic offline gate and database
  integration/e2e jobs without real LLM or embeddings calls.

### Modified Capabilities

- `project-foundation`: Add requirements for a valid deployed app icon and removal of obsolete
  repository placeholder files.
- `internationalization`: Strengthen language switching so locale changes complete without React
  script-tag runtime warnings.
- `error-tracking`: Remove the Sentry scaffold/example page while keeping real Sentry
  instrumentation and tests.

## Impact

- Adds `.github/workflows/` CI configuration and any required test/build support scripts or env
  defaults.
- Updates app icon files or route conventions under `app/`.
- Removes tracked `.gitkeep` files from project-owned source/test directories.
- Updates the language/theme/provider composition or related tests around locale switching.
- Removes `app/[locale]/sentry-example-page/page.tsx` and any references to that demo route.
- Updates OpenSpec change inventory by removing the superseded `build-decision-mirror` change
  when implementation is complete.
