## Context

Decision Mirror currently has ten Vitest files directly under `tests/`. The files cover several
different concerns: domain taxonomy, i18n catalogs, design tokens, a React component, and a
database integration test. The flat layout works at the current size, but it gives no obvious
answer for where future agent contract tests, route-handler integration tests, component tests,
fixtures, provider mocks, or Playwright flows should live.

The existing architecture already defines the testing pyramid: unit tests are fast and offline,
integration tests can use real Postgres with mocked LLM/provider boundaries, e2e tests are
deterministic Playwright flows, and evals are outside the commit gate. The test structure should
make those boundaries visible in the filesystem.

## Goals / Non-Goals

**Goals:**

- Make the test tree easy to scan by organizing tests first by layer and then by feature area.
- Preserve the existing deterministic default gate: `pnpm test` runs offline unit/component tests
  and does not run database integration tests or Playwright.
- Provide clear homes for shared fixtures, builders, setup, and mocks without creating another
  unstructured test root.
- Move the existing flat tests without changing the behaviors they assert.
- Add a structure guard test so future additions cannot drift back into a flat or ambiguous
  layout.

**Non-Goals:**

- No production behavior changes.
- No rewrite of existing assertions beyond path-related adjustments needed by the move.
- No real-model tests, eval harness, or Playwright authoring as part of this change.
- No new dependencies.

## Decisions

### Use a layer-first Vitest tree

Vitest tests will live under:

```text
tests/
  unit/
    <feature>/
      *.test.ts
  component/
    <feature>/
      *.test.tsx
  integration/
    <feature>/
      *.integration.test.ts
  support/
    builders/
    fixtures/
    mocks/
    setup/
```

Feature folders use kebab-case capability or bounded-area names, such as `domain-taxonomy`,
`internationalization`, `design-system`, `theme`, `data-model`, and future `agent`.

Rationale: layer-first mirrors the architecture testing pyramid and makes runner inclusion rules
simple. Feature-first was considered, but it would scatter unit/component/integration boundaries
inside every feature folder and make it easier to accidentally include slow or environment-bound
tests in the default gate. Pure co-location next to production files was also considered, but the
project already has a central `tests/` root and the immediate problem is that the central root is
unstructured.

### Keep Playwright in `e2e/`

Playwright specs stay outside `tests/`:

```text
e2e/
  <feature>/
    *.spec.ts
```

Rationale: the architecture already reserves `e2e/` for Playwright. Keeping it separate avoids
mixing browser-runner conventions with Vitest conventions while still using the same feature
folder naming pattern.

### Make runner boundaries explicit

`vitest.config.ts` will include only unit and component tests plus support setup files needed for
those layers. It will exclude `tests/integration/**`, `e2e/**`, and any `*.integration.test.*`.

`vitest.integration.config.ts` will include only `tests/integration/**/*.integration.test.{ts,tsx}`
and will continue to use the Node environment with self-skipping behavior when `DATABASE_URL` is
not present.

Rationale: filename suffixes are useful, but directory boundaries make the intent easier to see
and harder to break. The combination of directory and suffix keeps integration tests recognizable
in editor search, CI logs, and direct file runs.

### Add a structure guard test first

Implementation should begin with a failing test, for example
`tests/unit/test-organization/structure.test.ts`, that scans the test tree and rejects:

- test files directly under `tests/`
- integration test suffixes outside `tests/integration/`
- non-integration test suffixes inside `tests/integration/`
- Playwright `*.spec.ts` files inside `tests/`
- uncategorized shared helper files outside `tests/support/{builders,fixtures,mocks,setup}`

Rationale: this gives the reorganization a concrete contract and satisfies the repository's TDD
rule before any file moves or config changes.

### Migrate existing tests by current concern

Existing flat tests should move as follows:

```text
tests/design-accents.test.ts
  -> tests/unit/design-system/accents.test.ts
tests/design-contrast.test.ts
  -> tests/unit/design-system/contrast.test.ts
tests/design-tokens.test.ts
  -> tests/unit/design-system/tokens.test.ts
tests/i18n-message-parity.test.ts
  -> tests/unit/internationalization/message-parity.test.ts
tests/i18n-taxonomy-coverage.test.ts
  -> tests/unit/internationalization/taxonomy-coverage.test.ts
tests/i18n-taxonomy-labels.test.ts
  -> tests/unit/internationalization/taxonomy-labels.test.ts
tests/taxonomy.test.ts
  -> tests/unit/domain-taxonomy/taxonomy.test.ts
tests/taxonomy-composition.test.ts
  -> tests/unit/domain-taxonomy/composition.test.ts
tests/theme-toggle.test.tsx
  -> tests/component/theme/theme-toggle.test.tsx
tests/data-model.integration.test.ts
  -> tests/integration/data-model/data-model.integration.test.ts
```

Rationale: the new filenames stay short because the parent folder carries the feature context.
This keeps test names readable in editor tabs and CLI output.

## Risks / Trade-offs

- Existing scripts or editor test shortcuts may rely on old paths -> Mitigation: update
  documentation and keep filename suffixes conventional so direct file runs remain obvious.
- A structure guard can become too strict and slow down legitimate changes -> Mitigation: enforce
  only layer, suffix, and support-folder rules; do not encode every possible feature folder name.
- Layer-first organization may make all tests for one feature span multiple directories ->
  Mitigation: use the same feature folder names across layers so search and editor grouping still
  work predictably.
- Moving tests may create noisy git diffs -> Mitigation: preserve assertion bodies and avoid
  opportunistic refactors during the move.
