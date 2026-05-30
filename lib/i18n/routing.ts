import { defineRouting } from "next-intl/routing";

/**
 * The single source of truth for supported locales.
 *
 * English is the default; Ukrainian is fully supported. Routing, the request
 * config, the middleware, and the language switcher all derive from this — do
 * not redeclare the locale list anywhere else.
 */
export const routing = defineRouting({
  locales: ["en", "uk"],
  defaultLocale: "en",
  localeCookie: true,
});

export type Locale = (typeof routing.locales)[number];
