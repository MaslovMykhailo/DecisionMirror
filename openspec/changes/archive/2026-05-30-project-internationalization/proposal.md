## Why

Decision Mirror must ship with first-class internationalization (English + Ukrainian) per the
product requirements, but the app skeleton currently has no i18n: `messages/` and `lib/i18n/`
are empty placeholders and `next-intl` is not installed. Every feature built after this point
(capture form, history, dashboard, UX states, taxonomy labels) needs a localization
foundation to render against, so this layer must land before feature work to avoid retrofitting
hard-coded strings.

## What Changes

- Install and configure **next-intl** for the App Router with a `app/[locale]/…` segment,
  `en` (default) and `uk` locales, and a request-config + middleware that resolve the active
  locale and load the right messages.
- **BREAKING (internal)**: relocate the root layout/page under `app/[locale]/` so all routes
  are locale-scoped. No public routes exist yet, so there is no external contract break.
- Scaffold `messages/en.json` and `messages/uk.json` with the initial UI-chrome namespaces and
  the controlled-taxonomy labels (decision categories + the 8 cognitive-bias names), keyed by
  the language-neutral identifiers from `domain-taxonomy`.
- Add a **language switcher** component that changes the active locale and **persists** the
  choice across sessions via a cookie; the unmatched/default locale resolves to `en`.
- Provide **locale-correct formatting** helpers (dates, numbers, relative times) via next-intl's
  formatters, plus typed `useTranslations`/`getTranslations` access and a message-key presence
  guard so missing keys are caught in the test gate.

Out of scope (owned by later changes): generating the agent's free-form LLM prose in the user's
locale, and auth/feature UIs. This change only establishes the foundation and the language-neutral
→ localized-label contract those features render against.

## Capabilities

### New Capabilities
- `internationalization`: UI is available in English (default) and Ukrainian; users can switch
  and persist their language; dates/numbers/relative-times are locale-correct; controlled
  taxonomies are displayed as translated labels while stored and aggregated as language-neutral
  identifiers.

### Modified Capabilities
<!-- None. domain-taxonomy already delegates label display to internationalization; no taxonomy
     requirement changes here. project-foundation already lists messages/ in the layout. -->

## Impact

- **Dependencies**: add `next-intl`.
- **Code**: new `app/[locale]/` route group (move existing `app/layout.tsx` / `app/page.tsx`);
  `middleware.ts` for locale negotiation; `lib/i18n/` (routing config, request config, formatting
  helpers, locale constants); `messages/en.json` + `messages/uk.json`; a `LanguageSwitcher`
  component.
- **Specs**: new `internationalization` capability spec; aligns with the existing
  `domain-taxonomy` (language-neutral identifiers) and `project-foundation` (directory layout)
  specs — no requirement changes to those.
- **Tests**: i18n message-key presence in the unit suite; locale switch is later covered by e2e
  (out of scope here).
