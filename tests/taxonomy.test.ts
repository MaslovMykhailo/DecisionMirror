import { describe, expect, it } from "vitest";

import { biasSchema, categorySchema, COGNITIVE_BIASES, DECISION_CATEGORIES } from "@/lib/taxonomy";

describe("decision category taxonomy", () => {
  it("accepts every canonical category identifier", () => {
    for (const category of DECISION_CATEGORIES) {
      expect(categorySchema.safeParse(category).success).toBe(true);
    }
  });

  it("rejects a value that is not in the canonical enum", () => {
    expect(categorySchema.safeParse("not-a-real-category").success).toBe(false);
    expect(categorySchema.safeParse("").success).toBe(false);
  });

  it("exposes stable language-neutral identifiers (no whitespace, snake_case-safe)", () => {
    for (const category of DECISION_CATEGORIES) {
      expect(category).toMatch(/^[a-z][a-z0-9_]*$/);
    }
  });
});

describe("cognitive-bias catalog", () => {
  it("contains exactly eight distinct biases", () => {
    expect(COGNITIVE_BIASES).toHaveLength(8);
    expect(new Set(COGNITIVE_BIASES).size).toBe(8);
  });

  it("accepts every bias in the catalog", () => {
    for (const bias of COGNITIVE_BIASES) {
      expect(biasSchema.safeParse(bias).success).toBe(true);
    }
  });

  it("rejects a bias that is not in the catalog", () => {
    expect(biasSchema.safeParse("dunning_kruger").success).toBe(false);
    expect(biasSchema.safeParse("anchoring_bias").success).toBe(false);
  });

  it("exposes stable language-neutral identifiers", () => {
    for (const bias of COGNITIVE_BIASES) {
      expect(bias).toMatch(/^[a-z][a-z0-9_]*$/);
    }
  });
});
