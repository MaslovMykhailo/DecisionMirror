# test-organization Specification

## Purpose

Defines the Decision Mirror test-suite organization: layer-first directories for Vitest unit,
component, and integration tests; feature folders beneath each layer; scoped support helpers; and
runner discovery rules that preserve the deterministic offline gate.

## Requirements
### Requirement: Layered test directories

The system SHALL organize tests by runner layer before feature area. Vitest unit tests SHALL live
under `tests/unit/<feature>/`, Vitest component tests SHALL live under
`tests/component/<feature>/`, Vitest integration tests SHALL live under
`tests/integration/<feature>/`, and Playwright end-to-end specs SHALL live under
`e2e/<feature>/`. Feature directory names SHALL use kebab-case and SHOULD match the capability or
bounded area under test.

#### Scenario: Unit test location is obvious

- **WHEN** a contributor adds a deterministic test for pure domain taxonomy behavior
- **THEN** the test file is placed under `tests/unit/domain-taxonomy/`
- **AND** the test filename ends with `.test.ts`

#### Scenario: Component test location is obvious

- **WHEN** a contributor adds a deterministic React component test
- **THEN** the test file is placed under `tests/component/<feature>/`
- **AND** the test filename ends with `.test.tsx`

#### Scenario: Integration test location is obvious

- **WHEN** a contributor adds a Vitest integration test that uses route handlers, Prisma, or a
  real database
- **THEN** the test file is placed under `tests/integration/<feature>/`
- **AND** the test filename ends with `.integration.test.ts` or `.integration.test.tsx`

#### Scenario: End-to-end test location remains separate

- **WHEN** a contributor adds a deterministic Playwright flow
- **THEN** the test file is placed under `e2e/<feature>/`
- **AND** the test filename ends with `.spec.ts`

### Requirement: Root test directory has no loose test files

The system SHALL keep `tests/` as a set of named layer and support directories, not as a place for
loose test files. No file matching a test suffix SHALL be placed directly under `tests/`.

#### Scenario: Flat root tests are rejected

- **WHEN** a file matching `tests/*.test.ts`, `tests/*.test.tsx`, `tests/*.integration.test.ts`,
  or `tests/*.integration.test.tsx` exists
- **THEN** the offline test gate fails with a message identifying the misplaced file

### Requirement: Runner discovery preserves deterministic gates

The system SHALL configure test runners so the default Vitest gate discovers unit and component
tests only, while integration tests are run by the dedicated integration command. The default
offline gate MUST NOT require a database, browser automation, external network, real LLM provider,
or embeddings provider.

#### Scenario: Default test command excludes integration

- **WHEN** `pnpm test` runs
- **THEN** tests under `tests/unit/**` and `tests/component/**` are discovered
- **AND** tests under `tests/integration/**` are not executed

#### Scenario: Integration command includes only integration tests

- **WHEN** `pnpm test:integration` runs
- **THEN** only files under `tests/integration/**` with an `.integration.test.ts` or
  `.integration.test.tsx` suffix are discovered
- **AND** LLM and embeddings providers remain mocked or stubbed

### Requirement: Shared test support is scoped

The system SHALL place shared test-only helpers under `tests/support/` using one of these
subdirectories: `builders`, `fixtures`, `mocks`, or `setup`. Support modules SHALL be imported by
tests but SHALL NOT be named as executable test files.

#### Scenario: Fixture helper has a structured home

- **WHEN** a contributor adds reusable canned analysis output for tests
- **THEN** it is placed under `tests/support/fixtures/`
- **AND** it does not use a `.test.ts`, `.test.tsx`, or `.spec.ts` suffix

#### Scenario: Provider mock has a structured home

- **WHEN** a contributor adds a reusable mock for an LLM or embeddings provider
- **THEN** it is placed under `tests/support/mocks/`
- **AND** no real provider call is introduced into unit, component, integration, or e2e tests

### Requirement: Existing tests migrate without behavior changes

The system SHALL migrate the existing flat `tests/*.test.*` files into the layered structure while
preserving their asserted behavior. Migration edits SHALL be limited to path, naming, import, or
setup changes required by the new structure.

#### Scenario: Existing suite keeps passing after migration

- **WHEN** the flat tests are moved into the layered structure
- **THEN** `pnpm test` passes with the same unit and component assertions
- **AND** `pnpm test:integration` runs the database integration test when `DATABASE_URL` is
  available and self-skips when it is not
