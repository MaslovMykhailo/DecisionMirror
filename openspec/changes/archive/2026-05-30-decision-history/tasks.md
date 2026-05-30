## 1. User-Scoped Read Models

- [x] 1.1 Add failing unit tests for a decision history list read model covering session-user scoping, empty results, newest analysis status, and newest ready category.
- [x] 1.2 Implement the decision history list read model in `lib/decisions/` using only the session-derived `userId`.
- [x] 1.3 Add failing unit tests for a decision detail read model covering original input, newest status, newest ready result, failed reason, processing-without-ready, and cross-user denial.
- [x] 1.4 Implement the decision detail read model in `lib/decisions/` using only the session-derived `userId`.

## 2. Shared Status Presentation

- [x] 2.1 Add failing component tests for shared analysis status badge rendering for `processing`, `ready`, and `failed` states.
- [x] 2.2 Implement shared status badge/state presentation components used by list and detail views.
- [x] 2.3 Add localized decision-history and analysis-state messages to English and Ukrainian message files, preserving message parity.

## 3. Decision History List View

- [x] 3.1 Add failing render tests for the authenticated decision list showing summary, category when available, status badge, failed/not-ready explanations, and empty state.
- [x] 3.2 Build the localized authenticated decision list page scoped to the user.
- [x] 3.3 Add navigation from the authenticated app shell or home page to the decision history list.

## 4. Decision Detail View

- [x] 4.1 Add failing render tests for the decision detail view showing original input alongside ready analysis sections.
- [x] 4.2 Add failing render tests for detail processing, failed, cross-user/not-found, and previous-ready-during-reanalysis states.
- [x] 4.3 Build the localized authenticated decision detail page with original input and analysis result/state rendering.
- [x] 4.4 Link decision history rows to their corresponding decision detail pages.

## 5. Client Polling

- [x] 5.1 Add failing component tests for polling startup only when visible decisions are `processing`.
- [x] 5.2 Add failing component tests for polling backoff, capped delays, status updates, stopping on `ready` or `failed`, and refreshing data on a `ready` transition.
- [x] 5.3 Implement the client polling hook/component using the existing `/api/decisions/:id/status` endpoint.
- [x] 5.4 Wire polling into both decision history list and detail views.

## 6. Integration And Verification

- [x] 6.1 Add or extend integration tests proving decision list and detail queries exclude other users' decision and analysis content.
- [x] 6.2 Add deterministic UI/e2e coverage for empty history, processing state, failed state, and ready detail rendering with mocked or seeded analysis data.
- [x] 6.3 Run `pnpm lint`, `pnpm typecheck`, and `pnpm test`.
- [x] 6.4 Run relevant Playwright coverage if e2e tests were added or changed.
