import { describe, expect, it } from "vitest";

import { biasSchema, categorySchema, COGNITIVE_BIASES } from "@/lib/taxonomy";
import { decisionFacetsSchema } from "@/lib/validation/decision-facets";

// Proves the single-source-of-truth requirement: a downstream schema composes the
// canonical taxonomy *by reference*, so changing a member in lib/taxonomy.ts propagates
// to every consumer instead of drifting.
describe("downstream schemas reuse the canonical taxonomy", () => {
  it("composes the canonical category and bias schemas by reference", () => {
    expect(decisionFacetsSchema.shape.category).toBe(categorySchema);
    expect(decisionFacetsSchema.shape.biases.element).toBe(biasSchema);
  });

  it("accepts a facet object built from canonical identifiers", () => {
    const result = decisionFacetsSchema.safeParse({
      category: "career",
      biases: [...COGNITIVE_BIASES],
    });
    expect(result.success).toBe(true);
  });

  it("rejects a facet object with an out-of-catalog bias", () => {
    const result = decisionFacetsSchema.safeParse({
      category: "career",
      biases: ["not_a_bias"],
    });
    expect(result.success).toBe(false);
  });
});
