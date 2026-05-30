## 1. Stalled Status Contract

- [x] 1.1 Add failing unit tests for stale versus active processing analysis retryability with an injectable clock and timeout
- [x] 1.2 Implement a shared stalled/retryable analysis helper and apply it to status/read-model mapping
- [x] 1.3 Extend status endpoint tests to require `isStalled` and `retryable` booleans without exposing decision content
- [x] 1.4 Update status response types and client parsing to carry `isStalled` and `retryable`

## 2. Retry Flow

- [x] 2.1 Add failing service tests for retrying failed analyses, retrying stalled analyses, blocking active processing retries, and denying cross-user retries
- [x] 2.2 Implement retry service behavior that reuses the same analysis row, preserves version/locale, clears `failureReason`, and schedules `runAgent`
- [x] 2.3 Add failing route-handler tests for `POST /api/decisions/:decisionId/retry` authentication, ownership, conflict, and scheduling behavior
- [x] 2.4 Implement the retry route handler using the existing background scheduling pattern

## 3. Re-Analysis Flow

- [x] 3.1 Add failing service tests for appending the next analysis version, preserving prior rows, recording locale, blocking active processing duplicates, and denying cross-user re-analysis
- [x] 3.2 Implement re-analysis service behavior with version calculation guarded against duplicate processing/race conditions
- [x] 3.3 Add failing route-handler tests for `POST /api/decisions/:decisionId/reanalyze` authentication, ownership, conflict, locale, and scheduling behavior
- [x] 3.4 Implement the re-analysis route handler using the existing background scheduling pattern

## 4. Detail Versions and Controls

- [x] 4.1 Add failing read-model tests that `getDecisionHistoryDetail` returns ready versions sorted newest-first and keeps current analysis as the newest ready version
- [x] 4.2 Extend decision detail read-model types and mapping to include all ready analysis versions while omitting non-ready versions from selectable results
- [x] 4.3 Add failing component tests for the version switcher default selection, older ready version selection, and non-ready version omission
- [x] 4.4 Implement the detail version switcher with stable selected-version state and localized labels
- [x] 4.5 Add failing component tests for retry and re-analysis controls in failed, stalled, ready, and active-processing states
- [x] 4.6 Implement detail retry/re-analysis controls, optimistic status updates, pending/error states, and localized English/Ukrainian copy

## 5. Polling and State Rendering

- [x] 5.1 Add failing poller tests proving polling stops when a processing analysis becomes stalled and continues backing off while it is active
- [x] 5.2 Update `DecisionStatusPoller` to parse stalled metadata and stop polling stalled retryable analyses
- [x] 5.3 Add failing list/detail rendering tests for stalled retryable state and retry privacy-safe telemetry payloads
- [x] 5.4 Implement stalled state messages and badges in history/detail without sending raw decision or analysis content to telemetry

## 6. Verification

- [x] 6.1 Add or extend integration coverage for retry, re-analysis, and cross-user isolation with the LLM provider stubbed
- [x] 6.2 Run `pnpm lint`, `pnpm typecheck`, and the relevant unit/integration/component tests
- [x] 6.3 Update implementation notes or architecture docs only if the final implementation changes the proposed no-migration design
