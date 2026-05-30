import { describe, expect, it } from "vitest";

import { isAllowedValue, scrubProperties } from "@/lib/observability/scrub";

describe("observability scrub — allowed value shapes", () => {
  it("allows counts and durations (finite numbers)", () => {
    expect(isAllowedValue(0)).toBe(true);
    expect(isAllowedValue(42)).toBe(true);
    expect(isAllowedValue(1234.5)).toBe(true);
    expect(isAllowedValue(Number.NaN)).toBe(false);
    expect(isAllowedValue(Number.POSITIVE_INFINITY)).toBe(false);
  });

  it("allows booleans (reduced flags)", () => {
    expect(isAllowedValue(true)).toBe(true);
    expect(isAllowedValue(false)).toBe(true);
  });

  it("allows identifier / enum / status strings (no whitespace)", () => {
    expect(isAllowedValue("decision_1")).toBe(true);
    expect(isAllowedValue("analysis:clx0abcd1234")).toBe(true);
    expect(isAllowedValue("processing")).toBe(true);
    expect(isAllowedValue("confirmation_bias")).toBe(true);
    expect(isAllowedValue("career")).toBe(true);
    expect(isAllowedValue("decision-mirror@1.0.0+abc123")).toBe(true);
  });

  it("rejects free-form prose (whitespace or over-long strings)", () => {
    expect(isAllowedValue("Should I accept the new role?")).toBe(false);
    expect(isAllowedValue("It has more scope.")).toBe(false);
    expect(isAllowedValue("a".repeat(300))).toBe(false);
    expect(isAllowedValue("")).toBe(false);
  });
});

describe("observability scrub — property records", () => {
  it("keeps allowlisted values and strips any other key", () => {
    expect(
      scrubProperties({
        decisionId: "decision_1",
        version: 2,
        status: "processing",
        duration_ms: 1200,
        has_reasoning: true,
        situation: "Should I accept the new role?",
        reasoning: "It has more scope.",
      }),
    ).toEqual({
      decisionId: "decision_1",
      version: 2,
      status: "processing",
      duration_ms: 1200,
      has_reasoning: true,
    });
  });

  it("recursively scrubs nested objects", () => {
    expect(
      scrubProperties({
        decisionId: "decision_1",
        decisionInput: {
          situation: "long prose here that must never leave",
          version: 1,
        },
      }),
    ).toEqual({
      decisionId: "decision_1",
      decisionInput: { version: 1 },
    });
  });

  it("keeps arrays of allowed primitives and drops prose elements", () => {
    expect(
      scrubProperties({
        recalledMemoryIds: ["mem_1", "mem_2"],
        notes: ["this is prose", "more prose"],
      }),
    ).toEqual({
      recalledMemoryIds: ["mem_1", "mem_2"],
      notes: [],
    });
  });

  it("returns an empty object when given a non-object", () => {
    expect(scrubProperties(undefined)).toEqual({});
    expect(scrubProperties(null)).toEqual({});
    expect(scrubProperties("prose")).toEqual({});
  });
});
