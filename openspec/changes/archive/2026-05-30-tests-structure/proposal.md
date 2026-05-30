## Why

All current Vitest files live directly under `tests/`, which makes the suite harder to scan as
coverage grows across domain logic, UI, i18n, database integration, and future agent behavior.
Decision Mirror needs a predictable test organization that reinforces the existing testing
pyramid, keeps deterministic tests offline, and gives contributors an obvious place for each new
test.

## What Changes

- Introduce a documented test directory pattern organized first by test layer, then by feature or
  bounded area.
- Move existing flat `tests/*.test.*` files into the new structure without changing their
  assertions or broadening their scope.
- Update Vitest configuration so unit, component, and integration tests are discovered in their
  new locations while integration tests remain excluded from the default offline test command.
- Add naming and helper-placement rules so shared fixtures, builders, and mocks do not become a
  second unstructured test root.
- Update architecture documentation to make the pattern easy to follow for future TDD work.

## Capabilities

### New Capabilities

- `test-organization`: Defines the repository test taxonomy, naming conventions, runner
  discovery rules, helper/fixture placement, and migration expectations for existing tests.

### Modified Capabilities

None.

## Impact

- Affected code: `tests/**`, `vitest.config.ts`, `vitest.integration.config.ts`, and any
  test-support files introduced under the test tree.
- Affected docs: `architecture/01-dev-experience.md`, `architecture/05-testing.md`, and the new
  OpenSpec capability spec.
- No runtime APIs, production behavior, database schema, dependencies, or LLM/provider behavior
  change.
