import { describe, expect, it } from "vitest";

import en from "@/messages/en.json";
import uk from "@/messages/uk.json";

/** Collect every leaf key path (dot-joined) from a nested message catalog. */
function leafKeyPaths(obj: unknown, prefix = ""): string[] {
  if (obj === null || typeof obj !== "object") {
    return [prefix];
  }
  return Object.entries(obj as Record<string, unknown>).flatMap(([key, value]) =>
    leafKeyPaths(value, prefix ? `${prefix}.${key}` : key),
  );
}

describe("message catalog parity", () => {
  const enKeys = leafKeyPaths(en).sort();
  const ukKeys = leafKeyPaths(uk).sort();

  it("every English key exists in the Ukrainian catalog", () => {
    const missing = enKeys.filter((key) => !ukKeys.includes(key));
    expect(missing).toEqual([]);
  });

  it("every Ukrainian key exists in the English catalog", () => {
    const extra = ukKeys.filter((key) => !enKeys.includes(key));
    expect(extra).toEqual([]);
  });

  it("the catalogs have identical key sets", () => {
    expect(ukKeys).toEqual(enKeys);
  });
});
