## 1. Contract Test

- [x] 1.1 Add `tests/unit/test-organization/structure.test.ts` that scans the repository and fails while loose test files remain directly under `tests/`.
- [x] 1.2 Assert the allowed layer roots, executable test suffixes, integration placement rules, Playwright placement rules, and `tests/support/{builders,fixtures,mocks,setup}` helper locations.
- [x] 1.3 Run the new structure test and confirm it fails for the current flat `tests/*.test.*` files before moving anything.

## 2. Test Tree Migration

- [x] 2.1 Create the layer directories: `tests/unit/`, `tests/component/`, `tests/integration/`, and `tests/support/`.
- [x] 2.2 Move design-system tests to `tests/unit/design-system/` with short filenames: `tokens.test.ts`, `contrast.test.ts`, and `accents.test.ts`.
- [x] 2.3 Move internationalization tests to `tests/unit/internationalization/` and domain-taxonomy tests to `tests/unit/domain-taxonomy/`.
- [x] 2.4 Move `theme-toggle.test.tsx` to `tests/component/theme/theme-toggle.test.tsx`.
- [x] 2.5 Move `data-model.integration.test.ts` to `tests/integration/data-model/data-model.integration.test.ts`.
- [x] 2.6 Keep assertion bodies unchanged except for path, import, or setup adjustments required by the move.

## 3. Runner Configuration

- [x] 3.1 Update `vitest.config.ts` so `pnpm test` includes `tests/unit/**/*.test.{ts,tsx}` and `tests/component/**/*.test.{ts,tsx}` while excluding integration and e2e files.
- [x] 3.2 Update `vitest.integration.config.ts` so `pnpm test:integration` includes only `tests/integration/**/*.integration.test.{ts,tsx}`.
- [x] 3.3 Re-run the structure test and confirm it passes after the migration.

## 4. Documentation

- [x] 4.1 Update `architecture/01-dev-experience.md` with the new test tree, naming conventions, and support-helper directories.
- [x] 4.2 Update `architecture/05-testing.md` so unit, component, integration, e2e, and eval guidance points to the new locations.

## 5. Verification

- [x] 5.1 Run `pnpm test`.
- [x] 5.2 Run `pnpm test:integration` and verify the database integration test is selected, self-skipping only when `DATABASE_URL` is unavailable.
- [x] 5.3 Run `pnpm lint && pnpm typecheck`.
