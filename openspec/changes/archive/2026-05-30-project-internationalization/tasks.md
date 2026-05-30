## 1. Dependency and routing config

- [x] 1.1 Add `next-intl` to `package.json` and install via pnpm (lockfile committed)
- [x] 1.2 Create `lib/i18n/routing.ts` exporting `defineRouting({ locales: ['en','uk'], defaultLocale: 'en' })` as the single locale source of truth
- [x] 1.3 Create `lib/i18n/navigation.ts` deriving `Link`/`redirect`/`usePathname`/`useRouter` via `createNavigation(routing)`
- [x] 1.4 Create `middleware.ts` using next-intl middleware (cookie-persisted locale; matcher excludes `api`, `_next`, static assets)

## 2. Request config and locale-scoped layout

- [x] 2.1 Create `lib/i18n/request.ts` with `getRequestConfig` resolving the locale from `requestLocale`, validating with `hasLocale`, falling back to `defaultLocale`, and loading the matching messages
- [x] 2.2 Move `app/layout.tsx` and `app/page.tsx` under `app/[locale]/`; set `<html lang>` from the active locale
- [x] 2.3 Wrap children in `NextIntlClientProvider` in the locale root layout so Client Components receive messages
- [x] 2.4 Verify default-locale, Ukrainian, and unsupported-locale requests all resolve to a rendered page (manual/dev check)

## 3. Message catalogs

- [x] 3.1 Create `messages/en.json` with UI-chrome namespaces (`Common`, `Nav`, `LanguageSwitcher`, `UXState`) and a `Taxonomy.category.<id>` + `Taxonomy.bias.<id>` tree keyed by `domain-taxonomy` language-neutral identifiers
- [x] 3.2 Create `messages/uk.json` mirroring the exact key tree with Ukrainian translations
- [x] 3.3 Enable next-intl TypeScript message augmentation so referenced keys are checked at compile time

## 4. Formatting and language switcher

- [x] 4.1 Add `lib/i18n/format.ts` centralizing date/number/relative-time formats on top of next-intl's formatter (no ad-hoc `Intl.*`/`toLocaleString` at call sites)
- [x] 4.2 Build a `LanguageSwitcher` client component that switches the active locale and persists the choice (cookie via the navigation/router APIs)

## 5. Offline tests (test-first per TDD)

- [x] 5.1 Write a failing unit test asserting key parity between `messages/en.json` and `messages/uk.json` (every key in one exists in the other); make it green
- [x] 5.2 Write a failing unit test asserting every category enum member and all 8 bias identifiers have a `Taxonomy.*` label in both catalogs; make it green
- [x] 5.3 Write a unit/render test asserting taxonomy display resolves `id → translated label` while the underlying value stays the language-neutral identifier
- [x] 5.4 Run the full gate (`pnpm lint && pnpm typecheck && pnpm test`) and confirm it passes

## 6. Documentation alignment

- [x] 6.1 Confirm `ARCHITECTURE.md` / `architecture/03-ui-ux.md` still match the implemented setup; update if any decision changed (e.g. default-locale URL handling)
