import { describe, expect, it } from "vitest";

import { analysisOutputSchema } from "@/agent/schema";
import {
  invalidAnalysisOutputs,
  validAnalysisOutput,
} from "@/tests/support/fixtures/analysis-output";

describe("analysis output schema", () => {
  it("accepts a valid structured analysis payload", () => {
    const result = analysisOutputSchema.safeParse(validAnalysisOutput);

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.category).toBe("career");
    expect(result.data.biases[0]?.id).toBe("anchoring");
    expect(result.data.missedAlternatives).toEqual([
      "Negotiate a trial consulting project before resigning.",
    ]);
  });

  it.each([
    {
      name: "unknown category values",
      payload: invalidAnalysisOutputs.unknownCategory,
    },
    {
      name: "unknown bias values",
      payload: invalidAnalysisOutputs.unknownBias,
    },
    {
      name: "missing required sections",
      payload: invalidAnalysisOutputs.missingRequiredSection,
    },
    {
      name: "empty bias explanations",
      payload: invalidAnalysisOutputs.emptyBiasExplanation,
    },
    {
      name: "empty prose strings",
      payload: invalidAnalysisOutputs.emptyProse,
    },
    {
      name: "extra fields",
      payload: invalidAnalysisOutputs.extraField,
    },
  ])("rejects $name", ({ payload }) => {
    expect(analysisOutputSchema.safeParse(payload).success).toBe(false);
  });
});
