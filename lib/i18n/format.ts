import { useFormatter } from "next-intl";
import { getFormatter } from "next-intl/server";

/**
 * Locale-correct formatting, centralized.
 *
 * Feature code formats dates, numbers, and relative times through these
 * helpers — never with ad-hoc `Intl.*` or `toLocaleString`, which would not
 * honor the active locale or the shared named formats (see `formats` in
 * `request.ts`). The returned object is next-intl's formatter, so callers use
 * `format.dateTime(value, "short")`, `format.number(value)`, and
 * `format.relativeTime(value)`.
 */
export function useFormat() {
  return useFormatter();
}

/** Server-side counterpart of {@link useFormat} for Server Components. */
export function getFormat() {
  return getFormatter();
}
