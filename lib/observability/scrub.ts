/**
 * Shared privacy guard for every observability sink (Sentry, PostHog, LangSmith).
 *
 * No decision or analysis prose may leave the app in telemetry.
 * Rather than trust every call site, telemetry payloads are funneled
 * through this allowlist, which keeps only privacy-safe value shapes — identifiers,
 * enums, status values, counts, durations, and reduced booleans — and strips
 * anything that could carry free-form user prose.
 */

// Identifiers / enums / status values never contain whitespace; prose almost always
// does. We also cap length so a long whitespace-free blob cannot smuggle content.
const MAX_TOKEN_LENGTH = 200;
const TOKEN_PATTERN = /^[\w:.\-/@+]+$/;

/** True when a single value is a privacy-safe shape allowed to leave in telemetry. */
export function isAllowedValue(value: unknown): boolean {
  if (typeof value === "number") return Number.isFinite(value);
  if (typeof value === "boolean") return true;
  if (typeof value === "string") {
    return value.length > 0 && value.length <= MAX_TOKEN_LENGTH && TOKEN_PATTERN.test(value);
  }
  return false;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function scrubArray(values: unknown[]): unknown[] {
  return values
    .map((item) => (isPlainObject(item) ? scrubProperties(item) : item))
    .filter((item) => (isPlainObject(item) ? true : isAllowedValue(item)));
}

/**
 * Returns a copy of `props` keeping only allowlisted values. Nested plain objects are
 * scrubbed recursively; arrays keep only allowed primitives (and scrubbed objects).
 * Any other key — notably free-form prose strings — is dropped.
 */
export function scrubProperties(props: unknown): Record<string, unknown> {
  if (!isPlainObject(props)) return {};

  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(props)) {
    if (Array.isArray(value)) {
      result[key] = scrubArray(value);
    } else if (isPlainObject(value)) {
      result[key] = scrubProperties(value);
    } else if (isAllowedValue(value)) {
      result[key] = value;
    }
  }
  return result;
}
