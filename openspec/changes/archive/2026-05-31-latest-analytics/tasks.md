## 1. Read model: mode-aware aggregation

- [x] 1.1 Add a failing test in `tests/unit/analytics/dashboard-read-model.test.ts` for latest
  mode: with multiple ready versions of one decision, only the newest version's category/bias
  contribute (assert counts and that SQL contains `DISTINCT ON` + `ORDER BY ... "version" DESC`).
- [x] 1.2 Add a failing test that latest mode picks the newest *ready* version even when a newer
  `processing`/`failed` version exists (assert `status = 'ready'` is filtered before `DISTINCT ON`).
- [x] 1.3 Add a failing test that `mode: "all"` preserves the current all-versions SQL and counts.
- [x] 1.4 Add a failing test that an unrecognized/absent mode falls back to latest.
- [x] 1.5 Extend `getAnalyticsDashboard` in `lib/analytics/dashboard.ts` to accept `mode`
  (`"latest" | "all"`, default `"latest"`) and run the latest-mode `DISTINCT ON (decisionId)`
  CTE variant for both category and bias queries; keep all-versions queries unchanged. Reuse
  `categoryFrequencyFromRows` / `biasFrequencyFromRows` and keep `userId` scoping + no-prose
  projection. Make tests 1.1–1.4 green.

## 2. Page wiring: mode from URL

- [x] 2.1 Add a failing test (`tests/unit/analytics/dashboard-page.test.tsx`) that the page reads
  `mode` from `searchParams`, defaults to latest, and passes the resolved mode to the read model.
- [x] 2.2 Update `app/[locale]/analytics/page.tsx` to read/validate `mode` from `searchParams`
  and pass it to `getAnalyticsDashboard`; pass the active mode to the view. Make 2.1 green.

## 3. Mode toggle UI

- [x] 3.1 Add a failing view test (`tests/component/analytics/dashboard-view.test.tsx`) that the
  toggle renders both modes, marks the active mode, and links/navigates to `?mode=latest|all`.
- [x] 3.2 Add localized labels for the toggle to `messages/en.json` and `messages/uk.json` under
  `AnalyticsDashboard`.
- [x] 3.3 Implement the toggle as a Client Component (segmented links/`ToggleGroup`) that
  navigates to the current route with the updated `?mode=` param and reflects the active mode;
  render it in `components/analytics/dashboard-view.tsx`. Make 3.1 green.

## 4. Telemetry: dashboard_mode_changed

- [x] 4.1 Add a failing test (observability event tests + `tests/unit/observability/no-prose-leak`)
  that `dashboard_mode_changed` is in the catalog with only a `mode` (`"latest" | "all"`) property.
- [x] 4.2 Add `dashboard_mode_changed` to the client event types in
  `lib/observability/capture-client.ts` and `lib/observability/capture.ts`; emit it from the
  toggle on mode change. Make 4.1 green.

## 5. Verify

- [x] 5.1 Run `pnpm lint && pnpm typecheck && pnpm test` and confirm green.
- [x] 5.2 Sanity-check both modes in the running app (latest counts each decision once;
  all-versions counts every ready version) and confirm refresh preserves the mode.
