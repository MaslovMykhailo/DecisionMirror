## 1. i18n strings

- [x] 1.1 Add navigation label strings (home/capture link, active-state aria labels as needed) to the `Nav`/`Common` namespaces in both `en` and `uk` message catalogs.
- [x] 1.2 Add complexity label string(s) (e.g. `complexity` / `complexityValue`) to the relevant `DecisionHistory` and decision-detail namespaces in both `en` and `uk`.
- [x] 1.3 Run the catalog-completeness check to confirm `en` and `uk` are in parity.

## 2. Shared navigation bar (app-navigation)

- [x] 2.1 Write a failing component test for `AppNav`: renders home/capture, dashboard, history, language, theme, and logout controls.
- [x] 2.2 Write a failing test asserting the active destination is marked (`aria-current="page"`) based on pathname (home root, `/decisions`, `/analytics`).
- [x] 2.3 Create `components/app-nav.tsx` reusing the header markup currently inlined in `app/[locale]/page.tsx` (app name as home link, Dashboard, History, `LanguageSwitcher`, `ThemeToggle`, `LogoutButton`); use locale-aware `usePathname` for active state. Make tests green.
- [x] 2.4 Write a failing test for compact mobile layout (flex-wrap / no horizontal overflow, all destinations reachable, button labels collapse to icon-only with `sr-only` accessible names at the smallest breakpoint); implement responsive classes to green.
- [x] 2.5 Replace the inline header in `app/[locale]/page.tsx` with `<AppNav />`.
- [x] 2.6 Mount `<AppNav />` at the top of `app/[locale]/decisions/page.tsx`, `app/[locale]/decisions/[decisionId]/page.tsx`, and `app/[locale]/analytics/page.tsx`.

## 3. Auth-page theme & language controls (authentication, internationalization)

- [x] 3.1 Write a failing test that the login page renders both a theme control and a language control alongside the login form.
- [x] 3.2 Write the equivalent failing test for the signup page.
- [x] 3.3 Mount `ThemeToggle` and `LanguageSwitcher` on the login and signup pages (top corner/header row) without breaking the centered form layout; make tests green.

## 4. Language switcher alignment (internationalization)

- [x] 4.1 Write a failing test asserting the `LanguageSwitcher` select uses the aligned control height class (matching adjacent `h-9`/`size-9` controls).
- [x] 4.2 Update the `<select>` classes in `components/language-switcher.tsx` from `px-2 py-1` to an aligned height (e.g. `h-9`); make the test green and confirm visual alignment in the nav.

## 5. Page layout fixes (decision-history, analytics-dashboard)

- [x] 5.1 Change the history page container in `app/[locale]/decisions/page.tsx` from `grid min-h-screen … gap-8` to `flex min-h-screen … flex-col gap-8` (matching the home page) so content is top-aligned and not stretched.
- [x] 5.2 Change the analytics page container in `app/[locale]/analytics/page.tsx` the same way.
- [ ] 5.3 Verify the empty states (history "No decisions yet", analytics "No ready analyses yet") and populated states render at natural height with no large gaps, in both light and dark themes and at mobile width.

## 6. Complexity display (decision-history)

- [x] 6.1 Write a failing test for the history list: a row with a ready newest analysis shows its complexity; a non-ready row does not.
- [x] 6.2 Render complexity on ready rows in `components/decisions/decision-history-list.tsx` using the existing `decision.complexity` value and the localized label.
- [x] 6.3 Write a failing test for the decision detail view showing complexity for a ready analysis.
- [x] 6.4 Render complexity in `components/decisions/decision-detail-view.tsx` using the derived value (`deriveDecisionComplexity` / existing detail data) and the localized label; make tests green.

## 7. Control layout refinements (app-navigation, authentication, internationalization)

- [x] 7.1 Align auth-page controls (login/signup): language select left, theme toggle right (`justify-between`).
- [x] 7.2 Remove the visible text label from `LanguageSwitcher`, keeping the accessible `aria-label`.
- [x] 7.3 Reorder nav controls to theme → language → logout in `components/app-nav.tsx`.
- [x] 7.4 Collapse the logout button to icon-only on mobile (`sr-only sm:not-sr-only`), matching the other nav buttons.
- [x] 7.5 Render a home icon as part of the home link in the nav so it reads as a link.

## 8. Gate

- [x] 8.1 Run `pnpm lint && pnpm typecheck && pnpm test` and resolve any failures.
- [ ] 8.2 Manually verify all four authenticated pages share the nav with a working back-to-home, on desktop and mobile widths, in light and dark themes.
