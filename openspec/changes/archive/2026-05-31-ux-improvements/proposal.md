## Why

The app's navigation and layout have rough edges that make it harder to use than it should
be: there is no shared navigation bar, so once a user leaves the home page (e.g. into History
or Analytics) there is no way back to capture a decision. The history and analytics pages
stretch their content to fill the viewport, producing broken empty states and large vertical
gaps. The unauthenticated login/signup screens offer no theme or language control, and the
language selector is visually misaligned with the buttons beside it. Finally, the analysis
"complexity" we already derive is never surfaced in the UI, so a signal users could act on
stays hidden.

## What Changes

- Introduce a single shared, responsive navigation bar rendered across all authenticated pages
  (home/capture, history, analytics, decision detail). It provides a way back to the home/capture
  page plus Dashboard, History, language, theme, and logout controls, and collapses to a compact
  layout on mobile.
- Add a theme (light/dark/system) control and a language selector to the login and signup pages.
- Fix the language selector so its control height aligns with the adjacent buttons.
- Fix page layout so history and analytics no longer stretch content to fill the viewport:
  correct the broken empty states and remove the large vertical gaps between cards and rows.
- Surface analysis complexity in the UI: show it on each ready row in the history list and on the
  decision detail view.

## Capabilities

### New Capabilities
- `app-navigation`: A shared, responsive navigation bar used on every authenticated page,
  providing home/capture, dashboard, history, language, theme, and logout, and a compact mobile
  layout.

### Modified Capabilities
- `authentication`: The unauthenticated login and signup pages SHALL present theme and language
  controls.
- `internationalization`: The language switcher SHALL be available on the unauthenticated auth
  pages and SHALL render with a control height that matches adjacent navigation controls.
- `decision-history`: Each ready decision row SHALL display its analysis complexity, the decision
  detail view SHALL display complexity, and the history page SHALL NOT stretch its content to fill
  the viewport.
- `analytics-dashboard`: The analytics page SHALL NOT stretch its content to fill the viewport,
  and its empty state SHALL render without distortion.

## Impact

- New shared component (e.g. `components/app-nav.tsx`) consumed by `app/[locale]/page.tsx`,
  `app/[locale]/decisions/page.tsx`, `app/[locale]/decisions/[decisionId]/page.tsx`, and
  `app/[locale]/analytics/page.tsx`.
- Auth pages: `app/[locale]/login/page.tsx`, `app/[locale]/signup/page.tsx` (and/or the
  shared auth layout) gain theme + language controls.
- `components/language-switcher.tsx` control sizing.
- Layout containers on the history and analytics pages change from a stretched `grid min-h-screen`
  to a non-stretching flex column matching the home page.
- `components/decisions/decision-history-list.tsx` and `components/decisions/decision-detail-view.tsx`
  display complexity (data already derived by `deriveDecisionComplexity` in
  `lib/decisions/history.ts`; no schema or DB change).
- next-intl message catalogs (`en`, `uk`) gain strings for navigation labels and complexity.
- No provider, agent, or persistence changes. No telemetry payload changes beyond reusing
  existing UI event patterns.
