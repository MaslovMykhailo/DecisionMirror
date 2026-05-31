## ADDED Requirements

### Requirement: Single typed DB-dependency resolver

The system SHALL resolve an optional injected database dependency to a concrete client through a
single shared resolver utility rather than per-module `defaultDb()` / `resolveDb()` helpers. The
resolver MUST preserve the dependency's static type without an `as unknown as` cast at each call
site, and modules MUST type their injected DB dependency with concrete method-argument types
(no `args: unknown`) so a query-shape change is a compile-time error.

#### Scenario: Injected dependency is used as-is

- **WHEN** a service function is called with an explicit DB dependency
- **THEN** the resolver returns that dependency unchanged for use in queries

#### Scenario: Default client is resolved lazily when none is injected

- **WHEN** a service function is called without a DB dependency
- **THEN** the resolver returns the default Prisma client
- **AND** no module defines its own `as unknown as Resolved…Db` cast to obtain it

#### Scenario: Query-shape drift is a type error

- **WHEN** a caller passes a query argument whose shape does not match the dependency's method signature
- **THEN** the type checker reports an error rather than the mismatch reaching runtime

### Requirement: Raw SQL results validated at the trust boundary

The system SHALL validate the shape of every raw SQL result (`$queryRaw`, `$queryRawUnsafe`)
with a schema before consuming it, instead of casting the `unknown` result to a typed row. Vector
literals built for similarity queries MUST reject non-finite values before being embedded in SQL.

#### Scenario: Well-formed rows are accepted

- **WHEN** a raw SQL query returns rows matching the expected schema
- **THEN** the parsed, typed rows are returned to the caller

#### Scenario: Malformed rows are rejected

- **WHEN** a raw SQL query returns a row that does not match the expected schema
- **THEN** validation fails with an error instead of silently propagating an incorrect shape

#### Scenario: Invalid embedding vector is rejected

- **WHEN** an embedding vector contains a non-finite value
- **THEN** the system throws before constructing the SQL vector literal

### Requirement: Shared request-body parsing

The system SHALL parse incoming request bodies (JSON and form-encoded) through a single shared
reader used by every route handler, rather than duplicating content-type handling per route.

#### Scenario: JSON body is parsed once via the shared reader

- **WHEN** a route handler receives a request with a JSON or form-encoded body
- **THEN** the shared reader returns the parsed object
- **AND** no route handler defines its own inline content-type parsing

### Requirement: Shared analysis-status payload parsing

The system SHALL parse analysis-status response payloads on the client through a single shared,
schema-backed parser reused by every component that polls or refreshes analysis status.

#### Scenario: Status payload parsed by one shared parser

- **WHEN** a component receives an analysis-status payload from the API
- **THEN** it is validated and parsed by the shared parser
- **AND** no component defines its own duplicate manual status parser

### Requirement: Centralized authentication guard for service functions

The system SHALL obtain the authenticated user and short-circuit unauthenticated requests through
a single shared guard used by decision and analytics service functions, rather than repeating the
"get user → return unauthenticated result" block in each function.

#### Scenario: Unauthenticated request short-circuits

- **WHEN** a service function runs without an authenticated user
- **THEN** the shared guard yields the unauthenticated result without executing the query body

### Requirement: Owner-scoped agent memory load

The system SHALL scope the agent's decision lookup during memory load by the owning `userId` in
addition to the decision id, providing defense-in-depth even though ownership is already validated
before the agent runs.

#### Scenario: Decision load is owner-scoped

- **WHEN** the agent loads a decision for analysis
- **THEN** the lookup filters by both the decision id and its owning userId
