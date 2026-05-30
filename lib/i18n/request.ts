import { hasLocale } from "next-intl";
import { getRequestConfig } from "next-intl/server";

import { routing } from "./routing";

/**
 * Shared global formats so date/number/relative-time output is consistent
 * across the app. Feature code references these named formats (e.g.
 * `format.dateTime(value, "short")`) instead of passing options ad hoc.
 */
export const formats = {
  dateTime: {
    short: { day: "numeric", month: "short", year: "numeric" },
    long: { day: "numeric", month: "long", year: "numeric", hour: "numeric", minute: "numeric" },
  },
  number: {
    integer: { maximumFractionDigits: 0 },
  },
} as const;

/**
 * Resolves the active locale from the `[locale]` segment, validating it against
 * the supported set and falling back to the default when it is missing or
 * unsupported, then loads the matching message catalog.
 */
export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested) ? requested : routing.defaultLocale;

  return {
    locale,
    formats,
    messages: (await import(`@/messages/${locale}.json`)).default,
  };
});
